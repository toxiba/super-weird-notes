import fs from "node:fs";
import { getMainWindow } from "../window";
import { getLibraryRoot } from "./paths";

let watcher: fs.FSWatcher | null = null;
let changeTimer: NodeJS.Timeout | undefined;

export function notifyChanged() {
  if (changeTimer) clearTimeout(changeTimer);
  changeTimer = setTimeout(() => {
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("workspace:changed");
    }
  }, 180);
}

export function watchRoot() {
  watcher?.close();
  const libraryRoot = getLibraryRoot();
  if (!libraryRoot) return;
  try {
    watcher = fs.watch(libraryRoot, { recursive: true }, notifyChanged);
    watcher.on("error", (error) => {
      console.error("Library watcher failed:", error);
      watcher?.close();
      watcher = null;
    });
  } catch (error) {
    console.error("Could not watch library folder:", error);
    watcher = null;
  }
}

export function stopWatching() {
  watcher?.close();
}
