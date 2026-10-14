import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  expectedNoteFilename,
  filesIn,
  makeNoteFile,
  parseBranches,
  parseLinks,
  parseNoteFile,
  readNoteRecord,
  removeEmptyDirectories,
  safeName,
  titleSlug,
} from "../electron/notes";
import type { NoteRecord } from "../electron/preload";

const id = "1234abcd-0000-4000-8000-000000000000";

function sampleNote(overrides: Partial<NoteRecord> = {}): NoteRecord {
  return {
    id,
    title: "Deploy checklist",
    project: "Payments",
    type: "Feature",
    tags: ["release", "backend"],
    status: "Completed",
    workItemId: "WI-42",
    branches: [{ name: "feature/deploy", from: "main" }],
    prs: [{ label: "Main PR", url: "https://example.com/pr/1" }],
    docs: [{ label: "", url: "https://example.com/doc" }],
    createdAt: "2026-01-02T03:04:05.000Z",
    updatedAt: "2026-02-03T04:05:06.000Z",
    body: "First line\n\n---\nNot a header\n",
    path: "",
    deleted: false,
    fileNameMismatch: false,
    ...overrides,
  };
}

describe("parseNoteFile", () => {
  it("splits the YAML header from the body", () => {
    const parsed = parseNoteFile("---\ntitle: Hello\ntags:\n  - a\n---\nBody text\n");
    expect(parsed.data).toEqual({ title: "Hello", tags: ["a"] });
    expect(parsed.content).toBe("Body text\n");
  });

  it("accepts CRLF line endings", () => {
    const parsed = parseNoteFile("---\r\ntitle: Hello\r\n---\r\nBody\r\n");
    expect(parsed.data).toEqual({ title: "Hello" });
    expect(parsed.content).toBe("Body\r\n");
  });

  it("accepts a header with nothing after it", () => {
    const parsed = parseNoteFile("---\ntitle: Only header\n---");
    expect(parsed.data).toEqual({ title: "Only header" });
    expect(parsed.content).toBe("");
  });

  it("treats files without a header as plain body", () => {
    const text = "Just some text\n---\nmore\n";
    expect(parseNoteFile(text)).toEqual({ data: {}, content: text });
  });

  it("only treats a header at the very start of the file as metadata", () => {
    const text = "\n---\ntitle: Nope\n---\nBody";
    expect(parseNoteFile(text)).toEqual({ data: {}, content: text });
  });

  it("rejects headers that are not a mapping", () => {
    expect(() => parseNoteFile("---\n- a\n- b\n---\nBody")).toThrow("must be a mapping");
    expect(() => parseNoteFile("---\njust a string\n---\nBody")).toThrow("must be a mapping");
  });

  it("throws on invalid YAML", () => {
    expect(() => parseNoteFile("---\ntitle: [unclosed\n---\nBody")).toThrow();
  });
});

describe("makeNoteFile", () => {
  it("round-trips through parseNoteFile", () => {
    const note = sampleNote();
    const parsed = parseNoteFile(makeNoteFile(note));
    expect(parsed.content).toBe(note.body);
    expect(parsed.data).toEqual({
      id: note.id,
      title: note.title,
      type: note.type,
      tags: note.tags,
      status: note.status,
      workItemId: note.workItemId,
      branches: note.branches,
      prs: note.prs,
      docs: note.docs,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    });
  });

  it("writes an empty type as null", () => {
    expect(parseNoteFile(makeNoteFile(sampleNote({ type: "" }))).data.type).toBeNull();
  });

  it("keeps titles that look like YAML syntax intact", () => {
    const title = "key: value # not a comment";
    expect(parseNoteFile(makeNoteFile(sampleNote({ title }))).data.title).toBe(title);
  });
});

describe("parseLinks", () => {
  it("keeps only entries with a string url", () => {
    expect(
      parseLinks([
        { label: "PR", url: "https://a" },
        { url: "https://b" },
        { label: 5, url: "https://c" },
        { label: "no url" },
        null,
        "https://d",
      ]),
    ).toEqual([
      { label: "PR", url: "https://a" },
      { label: "", url: "https://b" },
      { label: "", url: "https://c" },
    ]);
  });

  it("returns an empty list for non-arrays", () => {
    expect(parseLinks(undefined)).toEqual([]);
    expect(parseLinks({ url: "https://a" })).toEqual([]);
  });
});

describe("parseBranches", () => {
  it("reads a branches list, accepting plain strings", () => {
    expect(
      parseBranches({ branches: [{ name: "feature/a", from: "main" }, "hotfix", { name: "b" }, { from: "x" }, null] }),
    ).toEqual([
      { name: "feature/a", from: "main" },
      { name: "hotfix", from: "" },
      { name: "b", from: "" },
    ]);
  });

  it("reads the older single branch/baseBranch fields as a one-item list", () => {
    expect(parseBranches({ branch: "feature/old", baseBranch: "develop" })).toEqual([
      { name: "feature/old", from: "develop" },
    ]);
    expect(parseBranches({ branch: "", baseBranch: "" })).toEqual([]);
    expect(parseBranches({})).toEqual([]);
  });
});

describe("file names", () => {
  it("replaces characters that are not allowed in file names", () => {
    expect(safeName('  a/b:c*d?"e<f>g|h  ')).toBe("a-b-c-d--e-f-g-h");
  });

  it("rejects empty and dot names", () => {
    for (const value of ["", "   ", ".", ".."]) {
      expect(() => safeName(value)).toThrow("Enter a valid name.");
    }
  });

  it("slugs titles", () => {
    expect(titleSlug("Café déjà vu!")).toBe("Cafe-deja-vu");
    expect(titleSlug("   ")).toBe("Untitled-note");
    expect(titleSlug("!!!")).toBe("note");
    expect(titleSlug("x".repeat(100))).toHaveLength(70);
  });

  it("builds the expected note filename from title and id", () => {
    expect(expectedNoteFilename("Deploy checklist", id)).toBe("Deploy-checklist--1234abcd.txt");
    expect(expectedNoteFilename("Deploy checklist", id, ".md")).toBe("Deploy-checklist--1234abcd.md");
  });
});

describe("file handling", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "swn-test-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("reads a note written by makeNoteFile", () => {
    const note = sampleNote();
    const file = path.join(dir, expectedNoteFilename(note.title, note.id));
    fs.writeFileSync(file, makeNoteFile(note));

    expect(readNoteRecord(file, "Payments", "fallback")).toEqual({ ...note, path: file });
  });

  it("flags notes whose filename does not match their title", () => {
    const note = sampleNote();
    const file = path.join(dir, "renamed-by-hand.txt");
    fs.writeFileSync(file, makeNoteFile(note));

    expect(readNoteRecord(file, "Payments", "fallback").fileNameMismatch).toBe(true);
  });

  it("falls back to defaults for a note without a header", () => {
    const file = path.join(dir, "Plain notes.md");
    fs.writeFileSync(file, "hello");
    const stat = fs.statSync(file);

    const record = readNoteRecord(file, "Unassigned", "Plain notes.md");
    expect(record).toMatchObject({
      id: "Plain notes.md",
      title: "Plain notes",
      project: "Unassigned",
      type: "",
      tags: [],
      status: "Active",
      prs: [],
      docs: [],
      body: "hello",
      deleted: false,
      updatedAt: stat.mtime.toISOString(),
    });
    expect(record).not.toHaveProperty("originalProject");
  });

  it("ignores header values of the wrong type", () => {
    const file = path.join(dir, "odd.txt");
    fs.writeFileSync(file, "---\nid: 7\ntitle: 8\ntags: [a, 1, b]\nstatus: Unknown\nprs: nope\n---\n");

    expect(readNoteRecord(file, "P", "fallback-id")).toMatchObject({
      id: "fallback-id",
      title: "odd",
      tags: ["a", "b"],
      status: "Active",
      prs: [],
    });
  });

  it("marks trashed notes as deleted with their original project", () => {
    const note = sampleNote();
    const file = path.join(dir, expectedNoteFilename(note.title, note.id));
    fs.writeFileSync(file, makeNoteFile(note));

    expect(readNoteRecord(file, "Payments", "trash-folder", "Payments")).toMatchObject({
      deleted: true,
      originalProject: "Payments",
    });
  });

  it("lists files recursively, skipping hidden ones unless asked", () => {
    fs.mkdirSync(path.join(dir, "sub", "deeper"), { recursive: true });
    fs.writeFileSync(path.join(dir, "a.txt"), "");
    fs.writeFileSync(path.join(dir, ".hidden"), "");
    fs.writeFileSync(path.join(dir, "sub", "deeper", "b.txt"), "");

    expect(filesIn(dir).sort()).toEqual(["a.txt", path.join("sub", "deeper", "b.txt")]);
    expect(filesIn(dir, "", true).sort()).toEqual([".hidden", "a.txt", path.join("sub", "deeper", "b.txt")]);
    expect(filesIn(path.join(dir, "missing"))).toEqual([]);
  });

  it("removes empty directory trees but keeps ones with files", () => {
    fs.mkdirSync(path.join(dir, "empty", "nested"), { recursive: true });
    fs.mkdirSync(path.join(dir, "full", "nested"), { recursive: true });
    fs.mkdirSync(path.join(dir, "full", "blank"), { recursive: true });
    fs.writeFileSync(path.join(dir, "full", "nested", "keep.txt"), "");

    removeEmptyDirectories(path.join(dir, "empty"));
    removeEmptyDirectories(path.join(dir, "full"));
    removeEmptyDirectories(path.join(dir, "missing"));

    expect(fs.existsSync(path.join(dir, "empty"))).toBe(false);
    expect(fs.existsSync(path.join(dir, "full", "nested", "keep.txt"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "full", "blank"))).toBe(false);
  });
});
