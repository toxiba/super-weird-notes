import { dialog, ipcMain } from "electron";
import { getLibraryRoot } from "../library/paths";
import { setRoot } from "../library/settings";
import { getSnapshot } from "../library/snapshot";
import { getMainWindow } from "../window";

async function chooseRoot() {
  const result = await dialog.showOpenDialog(getMainWindow()!, {
    title: "Choose your notes library folder",
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  setRoot(result.filePaths[0]);
  return getLibraryRoot();
}

export function registerWorkspaceHandlers() {
  ipcMain.handle("workspace:get-root", () => getLibraryRoot());
  ipcMain.handle("workspace:choose-root", chooseRoot);
  ipcMain.handle("workspace:get-snapshot", getSnapshot);
}
