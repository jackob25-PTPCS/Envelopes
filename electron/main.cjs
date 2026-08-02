/**
 * Envelopes — Electron shell.
 *
 * Starts the SimpleFIN sync server as a child process, then opens the app.
 * Closing the window shuts the server down with it: one icon, one lifecycle.
 *
 * Dev mode: start Vite yourself (`npm run dev`), then
 *   ELECTRON_START_URL=http://localhost:5173 npx electron .
 * Production: loads the built files from dist/.
 */
const { app, BrowserWindow, shell, Menu, dialog, nativeImage } = require("electron");
const { fork } = require("node:child_process");
const path = require("node:path");

const SYNC_PORT = process.env.PORT || "4000";
const DEV_URL = process.env.ELECTRON_START_URL;

// WM_CLASS on Linux derives from the app name; set it before any window exists
// so the launcher entry can match the running window to its icon.
app.setName("Envelopes");
const ICON = nativeImage.createFromPath(path.join(__dirname, "..", "build", "icon.png"));

let win = null;
let sync = null;

/* ---------- sync server ---------- */

function serverPath() {
  // asar can't be read by a plain node child, so server.mjs is unpacked
  const base = app.isPackaged
    ? path.join(process.resourcesPath, "app.asar.unpacked")
    : app.getAppPath();
  return path.join(base, "server.mjs");
}

function startSync() {
  sync = fork(serverPath(), [], {
    env: { ...process.env, PORT: SYNC_PORT, ELECTRON_RUN_AS_NODE: "1" },
    execPath: process.execPath,
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });

  sync.stdout?.on("data", (d) => console.log("[sync]", String(d).trim()));
  sync.stderr?.on("data", (d) => console.error("[sync]", String(d).trim()));

  sync.on("exit", (code) => {
    if (code && code !== 0 && win) {
      dialog.showMessageBox(win, {
        type: "warning",
        message: "The bank sync server stopped",
        detail: `It exited with code ${code}. Budgeting still works — only bank syncing is affected. Restart Envelopes to try again.`,
        buttons: ["OK"],
      });
    }
    sync = null;
  });
}

function stopSync() {
  if (sync) { sync.kill(); sync = null; }
}

/** Poll until the forked server answers, so we don't load a blank page. */
async function waitForServer(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${SYNC_PORT}/api/session`);
      if (r.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

/* ---------- window ---------- */

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 880,
    minHeight: 640,
    show: false,
    backgroundColor: "#FFFFFF",
    autoHideMenuBar: true,
    title: "Envelopes",
    icon: ICON,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.platform === "linux" && !ICON.isEmpty()) win.setIcon(ICON);
  win.once("ready-to-show", () => win.show());

  // Loading over http from our own server (rather than file://) means the
  // desktop app and any browser hitting this machine share one data store.
  if (DEV_URL) win.loadURL(DEV_URL);
  else waitForServer().then((ok) => {
    if (ok) win.loadURL(`http://127.0.0.1:${SYNC_PORT}/`);
    else {
      dialog.showMessageBox(win, {
        type: "error",
        message: "Couldn't reach the local server",
        detail: `Nothing answered on port ${SYNC_PORT}. If another copy of Envelopes or the systemd service is already running, close it and reopen this one.`,
        buttons: ["Quit"],
      }).then(() => app.quit());
    }
  });

  // anything that isn't the app itself opens in the real browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    const internal = DEV_URL ? url.startsWith(DEV_URL) : url.startsWith(`http://127.0.0.1:${SYNC_PORT}`);
    if (!internal) { e.preventDefault(); shell.openExternal(url); }
  });

  win.on("closed", () => { win = null; });
}

/* ---------- menu ---------- */

const menu = Menu.buildFromTemplate([
  {
    label: "Envelopes",
    submenu: [
      { label: "Reload", accelerator: "CmdOrCtrl+R", click: () => win?.reload() },
      { label: "Developer tools", accelerator: "CmdOrCtrl+Shift+I", click: () => win?.webContents.toggleDevTools() },
      { type: "separator" },
      {
        label: "Open sync server status",
        click: () => shell.openExternal(`http://localhost:${SYNC_PORT}/api/health`),
      },
      { type: "separator" },
      { role: "quit" },
    ],
  },
  { label: "Edit", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
  { label: "View", submenu: [{ role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" }, { role: "togglefullscreen" }] },
]);

/* ---------- lifecycle ---------- */

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(menu);
    startSync();
    createWindow();
    app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });

  app.on("window-all-closed", () => { stopSync(); app.quit(); });
  app.on("before-quit", stopSync);
  process.on("exit", stopSync);
}
