import { contextBridge, ipcRenderer } from "electron";
import type { ImportItem, NoteRecord } from "./types";

contextBridge.exposeInMainWorld("workspace", {
  getRoot: () => ipcRenderer.invoke("workspace:get-root"),
  chooseRoot: () => ipcRenderer.invoke("workspace:choose-root"),
  getSnapshot: () => ipcRenderer.invoke("workspace:get-snapshot"),
  createProject: (name: string) => ipcRenderer.invoke("project:create", name),
  renameProject: (name: string, nextName: string) =>
    ipcRenderer.invoke("project:rename", name, nextName),
  deleteProject: (name: string) => ipcRenderer.invoke("project:delete", name),
  createNote: (project: string) => ipcRenderer.invoke("note:create", project),
  recoverNote: (note: NoteRecord) => ipcRenderer.invoke("note:recover", note),
  saveNote: (note: NoteRecord) => ipcRenderer.invoke("note:save", note),
  deleteNote: (id: string) => ipcRenderer.invoke("note:delete", id),
  restoreNote: (id: string) => ipcRenderer.invoke("note:restore", id),
  emptyTrash: () => ipcRenderer.invoke("trash:empty"),
  importNotes: (items: ImportItem[]) =>
    ipcRenderer.invoke("import:notes", items),
  chooseImportFiles: () => ipcRenderer.invoke("import:choose-files"),
  openPath: (path: string) => ipcRenderer.invoke("files:open", path),
  openExternal: (url: string) => ipcRenderer.invoke("links:open-external", url),
  onChanged: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("workspace:changed", listener);
    return () => ipcRenderer.removeListener("workspace:changed", listener);
  },
});
