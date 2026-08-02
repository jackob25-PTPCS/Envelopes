/**
 * Bridges the local connect/error pages to the main process.
 * Deliberately not exposed to the remote server's pages — only file:// gets it.
 */
const { contextBridge, ipcRenderer } = require("electron");

if (location.protocol === "file:") {
  contextBridge.exposeInMainWorld("client", {
    config: () => ipcRenderer.invoke("client:config"),
    connect: (url) => ipcRenderer.invoke("client:connect", url),
    forget: () => ipcRenderer.invoke("client:forget"),
    retry: () => ipcRenderer.invoke("client:retry"),
  });
}
