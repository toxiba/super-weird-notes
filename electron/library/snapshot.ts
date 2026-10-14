import fs from "node:fs";
import path from "node:path";
import type { NoteRecord, Snapshot } from "../types";
import { isNoteFilename, readNoteRecord, safeReadDir } from "./notes";
import { getLibraryRoot, projectDir, trashDir } from "./paths";
import { projectNames } from "./projects";

export function noteRecords(): NoteRecord[] {
  if (!getLibraryRoot()) return [];
  const notes: NoteRecord[] = [];
  for (const project of projectNames()) {
    const directory = projectDir(project);
    const noteFiles = [directory, path.join(directory, "Notes")].flatMap((notesDirectory) =>
      safeReadDir(notesDirectory)
        .filter((file) => file.isFile() && isNoteFilename(file.name))
        .map((file) => path.join(notesDirectory, file.name)),
    );
    for (const fullPath of noteFiles) {
      try {
        notes.push(readNoteRecord(fullPath, project, path.basename(fullPath)));
      } catch (error) {
        console.error(`Could not read note ${fullPath}:`, error);
      }
    }
  }
  for (const folder of safeReadDir(trashDir())) {
    if (!folder.isDirectory()) continue;
    const directory = path.join(trashDir(), folder.name);
    try {
      const manifest = JSON.parse(fs.readFileSync(path.join(directory, "manifest.json"), "utf8")) as {
        originalProject: string;
      };
      const noteFile = safeReadDir(directory).find((entry) => entry.isFile() && isNoteFilename(entry.name));
      if (!noteFile) continue;
      const fullPath = path.join(directory, noteFile.name);
      notes.push(readNoteRecord(fullPath, manifest.originalProject, folder.name, manifest.originalProject));
    } catch (error) {
      console.error(`Could not read trash entry ${folder.name}:`, error);
    }
  }
  return notes;
}

export function getSnapshot(): Snapshot {
  const libraryRoot = getLibraryRoot();
  if (!libraryRoot) throw new Error("Choose a library folder first.");
  const notes = noteRecords();
  const types = notes.map((note) => note.type).filter(Boolean);
  return {
    root: libraryRoot,
    projects: projectNames().map((name) => ({
      name,
      notes: notes.filter((note) => note.project === name && !note.deleted).length,
    })),
    notes,
    noteTypes: [...new Set(["Feature", "Test", "UAT", "Fix", "Incident", "Data request", "Random", ...types])],
  };
}

export function assertUniqueNote(id: string, targetPath: string, currentPath: string) {
  const collision = noteRecords().find((note) =>
    note.id === id && note.path !== targetPath && note.path !== currentPath,
  );
  if (collision) throw new Error(`A note with id ${id} already exists.`);
}
