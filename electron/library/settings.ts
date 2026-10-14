import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { getLibraryRoot, projectsDir, setLibraryRoot, trashDir, UNASSIGNED } from "./paths";
import { ensureProject, projectNames } from "./projects";
import { watchRoot } from "./watcher";

function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

export function loadRoot() {
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath(), "utf8")) as {
      root?: string;
    };
    setLibraryRoot(settings.root && fs.existsSync(settings.root) ? settings.root : null);
  } catch {
    setLibraryRoot(null);
  }
  if (getLibraryRoot()) {
    fs.mkdirSync(projectsDir(), { recursive: true });
    ensureProject(UNASSIGNED);
    for (const project of projectNames()) ensureProject(project);
  }
}

export function setRoot(root: string) {
  setLibraryRoot(root);
  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(projectsDir(), { recursive: true });
  fs.mkdirSync(trashDir(), { recursive: true });
  ensureProject(UNASSIGNED);
  for (const project of projectNames()) ensureProject(project);
  fs.writeFileSync(settingsPath(), JSON.stringify({ root }, null, 2));
  watchRoot();
}
