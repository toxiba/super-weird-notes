import { app, BrowserWindow } from "electron";
import { registerHandlers } from "./ipc";
import { getLibraryRoot } from "./library/paths";
import { loadRoot } from "./library/settings";
import { stopWatching, watchRoot } from "./library/watcher";
import { createWindow } from "./window";

app.whenReady().then(() => {
  loadRoot();
  if (getLibraryRoot()) watchRoot();
  registerHandlers();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => stopWatching());
