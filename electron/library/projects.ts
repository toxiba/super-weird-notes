import fs from "node:fs";
import path from "node:path";
import { isNoteFilename, removeEmptyDirectories, safeReadDir } from "./notes";
import { projectDir, projectsDir } from "./paths";

export function ensureProject(name: string) {
  const directory = projectDir(name);
  fs.mkdirSync(directory, { recursive: true });
  const legacyNotesDirectory = path.join(directory, "Notes");
  for (const note of safeReadDir(legacyNotesDirectory)) {
    if (!note.isFile() || !isNoteFilename(note.name)) continue;
    const source = path.join(legacyNotesDirectory, note.name);
    const destination = path.join(directory, note.name);
    if (!fs.existsSync(destination)) fs.renameSync(source, destination);
  }
  for (const legacyDirectory of [legacyNotesDirectory, path.join(directory, "Files"), path.join(directory, "Attachments")]) {
    removeEmptyDirectories(legacyDirectory);
  }
  return directory;
}

export function projectNames(): string[] {
  return safeReadDir(projectsDir())
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}
