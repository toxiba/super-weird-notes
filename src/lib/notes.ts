import type { NoteRecord, Snapshot } from "../../electron/types";
import type { View } from "../types";
import { dateParts } from "./dates";

export const emptySnapshot: Snapshot = {
  root: "",
  projects: [],
  notes: [],
  noteTypes: [],
};

export function sameContent(a: NoteRecord, b: NoteRecord) {
  return a.title === b.title && a.project === b.project && a.type === b.type &&
    a.status === b.status && a.workItemId === b.workItemId && a.body === b.body &&
    JSON.stringify(a.branches) === JSON.stringify(b.branches) &&
    JSON.stringify(a.tags) === JSON.stringify(b.tags) &&
    JSON.stringify(a.prs) === JSON.stringify(b.prs) &&
    JSON.stringify(a.docs) === JSON.stringify(b.docs);
}

export type NoteFilters = {
  view: View;
  projectFilter: string | null;
  typeFilter: string | null;
  statusFilter: string | null;
  dateFilter: string | null;
  search: string;
};

export function filterNotes(notes: NoteRecord[], { view, projectFilter, typeFilter, statusFilter, dateFilter, search }: NoteFilters) {
  const query = search.trim().toLocaleLowerCase();
  return notes.filter((note) => {
    if (view === "trash" && !note.deleted) return false;
    if (view !== "trash" && note.deleted && !query) return false;
    if (projectFilter && note.project !== projectFilter) return false;
    if (typeFilter === "__untyped" && note.type.trim()) return false;
    if (typeFilter && typeFilter !== "__untyped" && note.type !== typeFilter) return false;
    if (statusFilter && note.status !== statusFilter) return false;
    if (dateFilter) {
      const parts = dateParts(note.createdAt);
      const value = dateFilter.split("/");
      if (value[0] !== parts.year) return false;
      if (value[1] && value[1] !== parts.quarter) return false;
      if (value[2] && value[2] !== parts.month) return false;
      if (value[3] && value[3] !== parts.day) return false;
    }
    if (!query) return true;
    const haystack = [
      note.title, note.body, note.project, note.type, note.status, note.workItemId,
      ...note.branches.flatMap((branch) => [branch.name, branch.from, branch.repo]), ...note.tags,
      ...note.prs.flatMap((link) => [link.label, link.url]),
      ...note.docs.flatMap((link) => [link.label, link.url]),
    ].join(" ").toLocaleLowerCase();
    return haystack.includes(query);
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
