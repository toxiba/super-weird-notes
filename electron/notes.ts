import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { LinkRecord, NoteRecord } from "./preload";

export function safeName(value: string) {
  const trimmed = value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-");
  if (!trimmed || trimmed === "." || trimmed === "..") {
    throw new Error("Enter a valid name.");
  }
  return trimmed;
}

export function isNoteFilename(name: string) {
  return [".md", ".txt"].includes(path.extname(name).toLowerCase());
}

export function safeReadDir(directory: string): fs.Dirent[] {
  try {
    return fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}

export function removeEmptyDirectories(directory: string) {
  if (!fs.existsSync(directory)) return;
  for (const entry of safeReadDir(directory)) {
    if (entry.isDirectory()) removeEmptyDirectories(path.join(directory, entry.name));
  }
  if (safeReadDir(directory).length === 0) fs.rmdirSync(directory);
}

export function filesIn(directory: string, relative = "", includeHidden = false): string[] {
  const output: string[] = [];
  for (const entry of safeReadDir(directory)) {
    if (!includeHidden && entry.name.startsWith(".")) continue;
    const childRelative = path.join(relative, entry.name);
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...filesIn(fullPath, childRelative, includeHidden));
    else output.push(childRelative);
  }
  return output;
}

export function parseLinks(value: unknown): LinkRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((link) => {
    if (!link || typeof link !== "object") return [];
    const item = link as Record<string, unknown>;
    return typeof item.url === "string"
      ? [{ label: typeof item.label === "string" ? item.label : "", url: item.url }]
      : [];
  });
}

export function makeNoteFile(note: NoteRecord) {
  const metadata = {
    id: note.id,
    title: note.title,
    type: note.type || null,
    tags: note.tags,
    status: note.status,
    workItemId: note.workItemId,
    branch: note.branch,
    baseBranch: note.baseBranch,
    prs: note.prs,
    docs: note.docs,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
  return `---\n${stringifyYaml(metadata).trimEnd()}\n---\n${note.body}`;
}

export function parseNoteFile(content: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  if (!match) return { data: {}, content };
  const data: unknown = parseYaml(match[1]);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Note YAML frontmatter must be a mapping.");
  }
  return {
    data: data as Record<string, unknown>,
    content: content.slice(match[0].length),
  };
}

export function titleSlug(title: string) {
  const slug = safeName(title.trim() || "Untitled note")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "note";
  return slug;
}

export function expectedNoteFilename(title: string, id: string, extension = ".txt") {
  return `${titleSlug(title)}--${id.slice(0, 8)}${extension}`;
}

// Reads a note file into a NoteRecord. `fallbackId` is used when the header has no id;
// passing `originalProject` marks the note as a trashed one.
export function readNoteRecord(
  fullPath: string,
  project: string,
  fallbackId: string,
  originalProject?: string,
): NoteRecord {
  const filename = path.basename(fullPath);
  const parsed = parseNoteFile(fs.readFileSync(fullPath, "utf8"));
  const data = parsed.data as Record<string, unknown>;
  const id = typeof data.id === "string" ? data.id : fallbackId;
  const title = typeof data.title === "string" ? data.title : filename.replace(/\.(md|txt)$/i, "");
  return {
    id,
    title,
    project,
    type: typeof data.type === "string" ? data.type : "",
    tags: Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === "string") : [],
    status: data.status === "Completed" || data.status === "Archived" ? data.status : "Active",
    workItemId: typeof data.workItemId === "string" ? data.workItemId : "",
    branch: typeof data.branch === "string" ? data.branch : "",
    baseBranch: typeof data.baseBranch === "string" ? data.baseBranch : "",
    prs: parseLinks(data.prs),
    docs: parseLinks(data.docs),
    createdAt: typeof data.createdAt === "string" ? data.createdAt : fs.statSync(fullPath).birthtime.toISOString(),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : fs.statSync(fullPath).mtime.toISOString(),
    body: parsed.content,
    path: fullPath,
    deleted: originalProject !== undefined,
    ...(originalProject !== undefined ? { originalProject } : {}),
    fileNameMismatch: filename !== expectedNoteFilename(title, id, path.extname(filename)),
  };
}
