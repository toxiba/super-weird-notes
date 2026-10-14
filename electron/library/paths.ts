import path from "node:path";
import { expectedNoteFilename } from "./notes";

export const UNASSIGNED = "Unassigned";
const projectRootName = "Projects";
let libraryRoot: string | null = null;

export function getLibraryRoot() {
  return libraryRoot;
}

export function setLibraryRoot(root: string | null) {
  libraryRoot = root;
}

export function projectsDir() {
  if (!libraryRoot) throw new Error("Choose a library folder first.");
  return path.join(libraryRoot, projectRootName);
}

export function projectDir(name: string) {
  return path.join(projectsDir(), name);
}

export function trashDir() {
  if (!libraryRoot) throw new Error("Choose a library folder first.");
  return path.join(libraryRoot, "Trash");
}

export function notePath(project: string, title: string, id: string) {
  return path.join(projectDir(project), expectedNoteFilename(title, id));
}
