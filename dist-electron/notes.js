"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeName = safeName;
exports.isNoteFilename = isNoteFilename;
exports.safeReadDir = safeReadDir;
exports.removeEmptyDirectories = removeEmptyDirectories;
exports.filesIn = filesIn;
exports.parseLinks = parseLinks;
exports.parseBranches = parseBranches;
exports.makeNoteFile = makeNoteFile;
exports.parseNoteFile = parseNoteFile;
exports.titleSlug = titleSlug;
exports.expectedNoteFilename = expectedNoteFilename;
exports.readNoteRecord = readNoteRecord;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const yaml_1 = require("yaml");
function safeName(value) {
    const trimmed = value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-");
    if (!trimmed || trimmed === "." || trimmed === "..") {
        throw new Error("Enter a valid name.");
    }
    return trimmed;
}
function isNoteFilename(name) {
    return [".md", ".txt"].includes(node_path_1.default.extname(name).toLowerCase());
}
function safeReadDir(directory) {
    try {
        return node_fs_1.default.readdirSync(directory, { withFileTypes: true });
    }
    catch {
        return [];
    }
}
function removeEmptyDirectories(directory) {
    if (!node_fs_1.default.existsSync(directory))
        return;
    for (const entry of safeReadDir(directory)) {
        if (entry.isDirectory())
            removeEmptyDirectories(node_path_1.default.join(directory, entry.name));
    }
    if (safeReadDir(directory).length === 0)
        node_fs_1.default.rmdirSync(directory);
}
function filesIn(directory, relative = "", includeHidden = false) {
    const output = [];
    for (const entry of safeReadDir(directory)) {
        if (!includeHidden && entry.name.startsWith("."))
            continue;
        const childRelative = node_path_1.default.join(relative, entry.name);
        const fullPath = node_path_1.default.join(directory, entry.name);
        if (entry.isDirectory())
            output.push(...filesIn(fullPath, childRelative, includeHidden));
        else
            output.push(childRelative);
    }
    return output;
}
function parseLinks(value) {
    if (!Array.isArray(value))
        return [];
    return value.flatMap((link) => {
        if (!link || typeof link !== "object")
            return [];
        const item = link;
        return typeof item.url === "string"
            ? [{ label: typeof item.label === "string" ? item.label : "", url: item.url }]
            : [];
    });
}
// Older notes store a single `branch`/`baseBranch` pair; newer ones store a `branches` list.
// Branches saved before the repo field existed read with an empty repo.
function parseBranches(data) {
    if (Array.isArray(data.branches)) {
        return data.branches.flatMap((branch) => {
            if (typeof branch === "string")
                return [{ name: branch, from: "", repo: "" }];
            if (!branch || typeof branch !== "object")
                return [];
            const item = branch;
            return typeof item.name === "string"
                ? [{
                        name: item.name,
                        from: typeof item.from === "string" ? item.from : "",
                        repo: typeof item.repo === "string" ? item.repo : "",
                    }]
                : [];
        });
    }
    const name = typeof data.branch === "string" ? data.branch : "";
    const from = typeof data.baseBranch === "string" ? data.baseBranch : "";
    return name || from ? [{ name, from, repo: "" }] : [];
}
function makeNoteFile(note) {
    const metadata = {
        id: note.id,
        title: note.title,
        type: note.type || null,
        tags: note.tags,
        status: note.status,
        workItemId: note.workItemId,
        branches: note.branches,
        prs: note.prs,
        docs: note.docs,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
    };
    return `---\n${(0, yaml_1.stringify)(metadata).trimEnd()}\n---\n${note.body}`;
}
function parseNoteFile(content) {
    const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
    if (!match)
        return { data: {}, content };
    const data = (0, yaml_1.parse)(match[1]);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Note YAML frontmatter must be a mapping.");
    }
    return {
        data: data,
        content: content.slice(match[0].length),
    };
}
function titleSlug(title) {
    const slug = safeName(title.trim() || "Untitled note")
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 70) || "note";
    return slug;
}
function expectedNoteFilename(title, id, extension = ".txt") {
    return `${titleSlug(title)}--${id.slice(0, 8)}${extension}`;
}
// Reads a note file into a NoteRecord. `fallbackId` is used when the header has no id;
// passing `originalProject` marks the note as a trashed one.
function readNoteRecord(fullPath, project, fallbackId, originalProject) {
    const filename = node_path_1.default.basename(fullPath);
    const parsed = parseNoteFile(node_fs_1.default.readFileSync(fullPath, "utf8"));
    const data = parsed.data;
    const id = typeof data.id === "string" ? data.id : fallbackId;
    const title = typeof data.title === "string" ? data.title : filename.replace(/\.(md|txt)$/i, "");
    return {
        id,
        title,
        project,
        type: typeof data.type === "string" ? data.type : "",
        tags: Array.isArray(data.tags) ? data.tags.filter((tag) => typeof tag === "string") : [],
        status: data.status === "Completed" || data.status === "Archived" ? data.status : "Active",
        workItemId: typeof data.workItemId === "string" ? data.workItemId : "",
        branches: parseBranches(data),
        prs: parseLinks(data.prs),
        docs: parseLinks(data.docs),
        createdAt: typeof data.createdAt === "string" ? data.createdAt : node_fs_1.default.statSync(fullPath).birthtime.toISOString(),
        updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : node_fs_1.default.statSync(fullPath).mtime.toISOString(),
        body: parsed.content,
        path: fullPath,
        deleted: originalProject !== undefined,
        ...(originalProject !== undefined ? { originalProject } : {}),
        fileNameMismatch: filename !== expectedNoteFilename(title, id, node_path_1.default.extname(filename)),
    };
}
