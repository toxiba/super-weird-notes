import type { ProjectRecord } from "../../electron/types";

export function normalizeProjectName(value: string) {
  return value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-");
}

export function validateProjectName(value: string, currentName: string | null, projects: ProjectRecord[]) {
  const normalized = normalizeProjectName(value);
  if (!normalized || normalized === "." || normalized === "..") return "Enter a valid project name.";
  if (normalized === "Unassigned" && !currentName) return "Unassigned is already provided.";
  const existing = projects.find((project) => project.name.toLocaleLowerCase() === normalized.toLocaleLowerCase());
  if (existing && (existing.name !== currentName || normalized !== currentName)) {
    return "A project with that name already exists.";
  }
  return "";
}
