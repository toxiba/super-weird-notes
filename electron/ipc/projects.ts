import { ipcMain } from "electron";
import fs from "node:fs";
import path from "node:path";
import { filesIn, removeEmptyDirectories, safeName } from "../library/notes";
import { projectDir, UNASSIGNED } from "../library/paths";
import { ensureProject } from "../library/projects";
import { assertUniqueNote, noteRecords } from "../library/snapshot";
import { notifyChanged } from "../library/watcher";

export function registerProjectHandlers() {
  ipcMain.handle("project:create", (_event, rawName: string) => {
    const name = safeName(rawName);
    if (name === UNASSIGNED) throw new Error("Unassigned is already provided.");
    if (fs.existsSync(projectDir(name))) throw new Error("A Project with that name already exists.");
    ensureProject(name);
    notifyChanged();
  });
  ipcMain.handle("project:rename", (_event, oldName: string, rawName: string) => {
    if (oldName === UNASSIGNED) throw new Error("Unassigned cannot be renamed.");
    const nextName = safeName(rawName);
    if (oldName === nextName) return;
    const from = projectDir(oldName);
    const to = projectDir(nextName);
    if (!fs.existsSync(from)) throw new Error("Project not found.");
    if (fs.existsSync(to)) throw new Error("A Project with that name already exists.");
    fs.renameSync(from, to);
    notifyChanged();
  });
  ipcMain.handle("project:delete", (_event, name: string) => {
    if (name === UNASSIGNED) throw new Error("Unassigned cannot be deleted.");
    const directory = projectDir(name);
    if (!fs.existsSync(directory)) throw new Error("Project not found.");
    const notes = noteRecords().filter((note) => note.project === name && !note.deleted);
    const managedFiles = new Set(notes.map((note) => path.relative(directory, note.path)));
    const otherFiles = filesIn(directory, "", true).filter((file) => !managedFiles.has(file));
    if (otherFiles.length > 0) throw new Error("This Project contains non-note files. Move them elsewhere before deleting the Project.");

    const unassignedDirectory = ensureProject(UNASSIGNED);
    const moves: { source: string; destination: string }[] = [];
    const destinations = new Set<string>();
    const addMove = (source: string, destination: string) => {
      if (fs.existsSync(destination) || destinations.has(destination)) {
        throw new Error("A note with the same filename already exists in Unassigned.");
      }
      destinations.add(destination);
      moves.push({ source, destination });
    };
    for (const note of notes) {
      const target = path.join(unassignedDirectory, path.basename(note.path));
      assertUniqueNote(note.id, target, note.path);
      addMove(note.path, target);
    }

    const completedMoves: typeof moves = [];
    try {
      for (const move of moves) {
        fs.renameSync(move.source, move.destination);
        completedMoves.push(move);
      }
    } catch (error) {
      for (const move of completedMoves.reverse()) {
        if (fs.existsSync(move.destination) && !fs.existsSync(move.source)) {
          fs.mkdirSync(path.dirname(move.source), { recursive: true });
          fs.renameSync(move.destination, move.source);
        }
      }
      throw error;
    }
    removeEmptyDirectories(directory);
    notifyChanged();
  });
}
