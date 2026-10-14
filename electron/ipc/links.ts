import { ipcMain, shell } from "electron";
import path from "node:path";
import { getLibraryRoot } from "../library/paths";

export function registerLinkHandlers() {
  ipcMain.handle("files:open", async (_event, target: string) => {
    const libraryRoot = getLibraryRoot();
    const resolvedRoot = libraryRoot ? path.resolve(libraryRoot) : "";
    const resolvedTarget = path.resolve(target);
    if (!resolvedRoot || (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`))) {
      throw new Error("Only files inside this library can be opened.");
    }
    const error = await shell.openPath(target);
    if (error) throw new Error(error);
  });
  ipcMain.handle("links:open-external", async (_event, value: string) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error("Enter a valid web URL first.");
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Only HTTP and HTTPS links can be opened.");
    }
    await shell.openExternal(url.toString());
  });
}
