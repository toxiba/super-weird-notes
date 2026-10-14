import { ipcMain } from "electron";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { NoteRecord } from "../types";
import { expectedNoteFilename, makeNoteFile, removeEmptyDirectories, safeReadDir } from "../library/notes";
import { notePath, trashDir, UNASSIGNED } from "../library/paths";
import { ensureProject, projectNames } from "../library/projects";
import { assertUniqueNote, noteRecords } from "../library/snapshot";
import { notifyChanged } from "../library/watcher";

export function registerNoteHandlers() {
  ipcMain.handle("note:create", (_event, project: string) => {
    if (!projectNames().includes(project)) throw new Error("Choose an existing Project.");
    const now = new Date();
    const title = now.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    const note: NoteRecord = {
      id: randomUUID(),
      title,
      project,
      type: "",
      tags: [],
      status: "Active",
      workItemId: "",
      branches: [],
      prs: [],
      docs: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      body: "",
      path: "",
      deleted: false,
      fileNameMismatch: false,
    };
    const target = notePath(project, title, note.id);
    fs.writeFileSync(target, makeNoteFile(note), { flag: "wx" });
    notifyChanged();
    return { ...note, path: target };
  });
  ipcMain.handle("note:recover", (_event, note: NoteRecord) => {
    const project = projectNames().includes(note.project) ? note.project : UNASSIGNED;
    ensureProject(project);
    const id = randomUUID();
    const now = new Date().toISOString();
    const recovered: NoteRecord = {
      ...note,
      id,
      project,
      updatedAt: now,
      path: "",
      deleted: false,
      fileNameMismatch: false,
    };
    const target = notePath(project, recovered.title, id);
    fs.writeFileSync(target, makeNoteFile(recovered), { flag: "wx" });
    notifyChanged();
    return { ...recovered, path: target };
  });
  ipcMain.handle("note:save", (_event, note: NoteRecord) => {
    if (note.deleted) throw new Error("Restore this note before editing it.");
    const current = noteRecords().find((candidate) => candidate.id === note.id && !candidate.deleted);
    if (!current) throw new Error("This note no longer exists in the library.");
    if (!projectNames().includes(note.project)) throw new Error("The note's Project no longer exists.");
    const target = notePath(note.project, note.title, note.id);
    assertUniqueNote(note.id, target, current.path);
    if (path.resolve(current.path) !== path.resolve(target)) {
      if (fs.existsSync(target)) throw new Error("A file with this title already exists.");
      fs.renameSync(current.path, target);
    }
    const updated = {
      ...note,
      updatedAt: new Date().toISOString(),
      fileNameMismatch: path.basename(target) !== expectedNoteFilename(note.title, note.id),
    };
    fs.writeFileSync(target, makeNoteFile(updated));
    notifyChanged();
    return { ...updated, path: target };
  });
  ipcMain.handle("note:delete", (_event, id: string) => {
    const note = noteRecords().find((candidate) => candidate.id === id && !candidate.deleted);
    if (!note) throw new Error("Note not found.");
    const trashEntry = path.join(trashDir(), `${id}-${randomUUID().slice(0, 8)}`);
    fs.mkdirSync(trashEntry, { recursive: true });
    fs.renameSync(note.path, path.join(trashEntry, path.basename(note.path)));
    fs.writeFileSync(path.join(trashEntry, "manifest.json"), JSON.stringify({ originalProject: note.project }, null, 2));
    notifyChanged();
  });
  ipcMain.handle("note:restore", (_event, id: string) => {
    const note = noteRecords().find((candidate) => candidate.id === id && candidate.deleted);
    if (!note) throw new Error("Trashed note not found.");
    const trashEntry = path.dirname(note.path);
    const targetProject = projectNames().includes(note.originalProject || note.project)
      ? note.originalProject || note.project
      : UNASSIGNED;
    ensureProject(targetProject);
    const target = notePath(targetProject, note.title, note.id);
    if (fs.existsSync(target)) throw new Error("A note with the same filename already exists in that Project.");
    fs.renameSync(note.path, target);
    fs.rmSync(path.join(trashEntry, "manifest.json"), { force: true });
    removeEmptyDirectories(path.join(trashEntry, "Attachments"));
    if (safeReadDir(trashEntry).length === 0) fs.rmdirSync(trashEntry);
    notifyChanged();
  });
  ipcMain.handle("trash:empty", () => {
    for (const entry of safeReadDir(trashDir())) {
      fs.rmSync(path.join(trashDir(), entry.name), { recursive: true, force: true });
    }
    notifyChanged();
  });
}
