/**
 * Envelopes — desktop client
 *
 * A window pointed at a self-hosted Envelopes server. It runs no server of its
 * own; everything (budgets, accounts, bank credentials) stays on the machine
 * you're connecting to. Sign-in is the server's own screen, and the session
 * cookie persists between launches.
 *
 * The server address is stored in config.json under the app's userData
 * directory, so it's asked for once.
 */

const { app, BrowserWindow, shell, Menu, dialog, ipcMain, session, nativeImage } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const CONFIG = path.join(app.getPath("userData"), "config.json");
const PAGES = path.join(__dirname, "pages");
const ICON = nativeImage.createFromPath(path.join(__dirname, "build", "icon.png"));

// Linux window managers key off WM_CLASS, which comes from the app name.
// Setting it before any window exists is what lets the launcher entry match.
app.setName("Envelopes");

let win = null;

/* ---------- config ---------- */

function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG, "utf8")); } catch { return {}; }
}

function writeConfig(patch) {
  const next = { ...readConfig(), ...patch };
  fs.mkdirSync(path.dirname(CONFIG), { recursive: true });
  fs.writeFileSync(CONFIG, JSON.stringify(next, null, 2));
  return next;
}

/** Accepts "example.com", "192.168.1.20:4000", or a full URL. */
function normalizeUrl(input) {
  let raw = String(input || "").trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) {
    // bare host:port on a private network is almost certainly plain http
    const local = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(raw);
    raw = (local ? "http://" : "https://") + raw;
  }
  try {
    const u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) return null;
    return u.origin;
  } catch {
    return null;
  }
}

/** Is there an Envelopes server answering there? */
async function probe(origin) {
  try {
    const res = await fetch(`${origin}/api/session`, { redirect: "follow" });
    if (!res.ok) return { ok: false, reason: `The server answered with ${res.status}.` };
    const body = await res.json();
    if (typeof body.authRequired === "undefined") {
      return { ok: false, reason: "Something is running there, but it isn't an Envelopes server." };
    }
    return { ok: true, session: body };
  } catch (err) {
    return { ok: false, reason: `Couldn't reach it — ${err.message}` };
  }
}

/* ---------- navigation ---------- */

const loadPage = (name, query) =>
  win.loadFile(path.join(PAGES, name), query ? { search: `?${new URLSearchParams(query)}` } : undefined);

async function connect(origin) {
  const result = await probe(origin);
  if (!result.ok) {
    await loadPage("error.html", { url: origin, reason: result.reason });
    return false;
  }
  writeConfig({ serverUrl: origin });
  await win.loadURL(origin + "/");
  return true;
}

async function openStartingPoint() {
  const { serverUrl } = readConfig();
  if (!serverUrl) return loadPage("connect.html");
  const ok = await connect(serverUrl);
  if (!ok) return; // error page already shown
}

/* ---------- ipc from the local pages ---------- */

ipcMain.handle("client:config", () => readConfig());

ipcMain.handle("client:connect", async (_e, input) => {
  const origin = normalizeUrl(input);
  if (!origin) return { ok: false, reason: "That doesn't look like an address." };
  const result = await probe(origin);
  if (!result.ok) return result;
  writeConfig({ serverUrl: origin });
  await win.loadURL(origin + "/");
  return { ok: true };
});

ipcMain.handle("client:forget", async () => {
  writeConfig({ serverUrl: null });
  await loadPage("connect.html");
  return { ok: true };
});

ipcMain.handle("client:retry", async () => {
  const { serverUrl } = readConfig();
  if (!serverUrl) return loadPage("connect.html");
  return connect(serverUrl);
});

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
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // preload needs require(); the renderer still has no Node
    },
  });

  if (process.platform === "linux" && !ICON.isEmpty()) win.setIcon(ICON);
  win.once("ready-to-show", () => win.show());
  openStartingPoint();

  // links that aren't the server open in the real browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (e, url) => {
    const { serverUrl } = readConfig();
    const internal = url.startsWith("file://") || (serverUrl && url.startsWith(serverUrl));
    if (!internal) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  win.webContents.on("did-fail-load", (_e, code, desc, failedUrl, isMainFrame) => {
    if (!isMainFrame || code === -3) return; // -3 is an aborted load, normal
    const { serverUrl } = readConfig();
    if (serverUrl && failedUrl.startsWith(serverUrl)) {
      loadPage("error.html", { url: serverUrl, reason: `${desc} (${code})` });
    }
  });

  win.on("closed", () => { win = null; });
}

/* ---------- menu ---------- */

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: "Envelopes",
      submenu: [
        { label: "Reload", accelerator: "CmdOrCtrl+R", click: () => win && win.reload() },
        {
          label: "Change server…",
          click: async () => {
            const { serverUrl } = readConfig();
            const { response } = await dialog.showMessageBox(win, {
              type: "question",
              message: "Connect to a different server?",
              detail: serverUrl
                ? `Currently connected to ${serverUrl}. You'll be asked for a new address, and you'll sign in again.`
                : "You'll be asked for an address.",
              buttons: ["Cancel", "Change server"],
              defaultId: 1,
              cancelId: 0,
            });
            if (response === 1) {
              writeConfig({ serverUrl: null });
              loadPage("connect.html");
            }
          },
        },
        {
          label: "Sign out",
          click: async () => {
            await session.defaultSession.clearStorageData({ storages: ["cookies"] });
            const { serverUrl } = readConfig();
            if (serverUrl) win.loadURL(serverUrl + "/");
          },
        },
        { type: "separator" },
        { label: "Developer tools", accelerator: "CmdOrCtrl+Shift+I", click: () => win && win.webContents.toggleDevTools() },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }],
    },
    {
      label: "View",
      submenu: [{ role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" }, { role: "togglefullscreen" }],
    },
  ]);
}

/* ---------- lifecycle ---------- */

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(buildMenu());
    createWindow();
    app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });

  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
}
