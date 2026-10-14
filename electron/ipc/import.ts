import { dialog, ipcMain } from "electron";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ImportItem, NoteRecord } from "../types";
import { makeNoteFile } from "../library/notes";
import { notePath } from "../library/paths";
import { projectNames } from "../library/projects";
import { notifyChanged } from "../library/watcher";
import { getMainWindow } from "../window";

export function registerImportHandlers() {
  ipcMain.handle("import:notes", (_event, items: ImportItem[]) => {
    let imported = 0;
    for (const item of items) {
      if (!projectNames().includes(item.project)) throw new Error(`Choose a valid Project for ${path.basename(item.path)}.`);
      if (path.extname(item.path).toLowerCase() !== ".txt") {
        throw new Error(`${path.basename(item.path)} is not a text file.`);
      }
      const stat = fs.statSync(item.path);
      const date = stat.birthtimeMs > 0 ? stat.birthtime : stat.mtime;
      const id = randomUUID();
      const title = path.basename(item.path, path.extname(item.path));
      const note: NoteRecord = {
        id, title, project: item.project, type: "", tags: [], status: "Active",
        workItemId: "", branches: [], prs: [], docs: [],
        createdAt: date.toISOString(), updatedAt: date.toISOString(),
        body: fs.readFileSync(item.path, "utf8"), path: "", deleted: false,
        fileNameMismatch: false,
      };
      const target = notePath(item.project, title, id);
      fs.writeFileSync(target, makeNoteFile(note), { flag: "wx" });
      imported += 1;
    }
    notifyChanged();
    return imported;
  });
  ipcMain.handle("import:choose-files", async () => {
    const result = await dialog.showOpenDialog(getMainWindow()!, {
      title: "Import notes",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Text notes", extensions: ["txt"] }],
    });
    return result.canceled ? [] : result.filePaths;
  });
}
