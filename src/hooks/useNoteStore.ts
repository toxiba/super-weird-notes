import { useCallback, useRef, useState } from "react";
import type { NoteRecord, Snapshot } from "../../electron/types";
import { emptySnapshot, sameContent } from "../lib/notes";

function without(set: Set<string>, id: string) {
  const next = new Set(set);
  next.delete(id);
  return next;
}

/**
 * The library as last read from disk, plus the in-app drafts of each note.
 * Tracks unsaved edits (dirty), notes changed outside the app while edited
 * (conflicts) and notes that disappeared while edited (missing).
 */
export function useNoteStore(onError: (message: string) => void) {
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [drafts, setDrafts] = useState<Record<string, NoteRecord>>({});
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const savedRef = useRef<Record<string, NoteRecord>>({});
  const [rootSelected, setRootSelected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [conflicts, setConflicts] = useState<Set<string>>(new Set());
  const [missingNotes, setMissingNotes] = useState<Set<string>>(new Set());
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  const refresh = useCallback(async () => {
    try {
      const next = await window.workspace.getSnapshot();
      setSnapshot(next);
      setRootSelected(true);
      const previousSaved = savedRef.current;
      const nextSaved = Object.fromEntries(next.notes.map((note) => [note.id, note]));
      const changedExternally = new Set<string>();
      const missingExternally = new Set<string>();
      for (const note of next.notes) {
        const previous = previousSaved[note.id];
        if (dirtyRef.current.has(note.id) && previous && !sameContent(previous, note)) {
          changedExternally.add(note.id);
        }
      }
      const nextIds = new Set(next.notes.map((note) => note.id));
      for (const id of dirtyRef.current) {
        if (previousSaved[id] && !nextIds.has(id)) missingExternally.add(id);
      }
      for (const id of missingExternally) nextSaved[id] = previousSaved[id];
      savedRef.current = nextSaved;
      if (changedExternally.size) {
        setConflicts((current) => new Set([...current, ...changedExternally]));
      }
      if (missingExternally.size) {
        setConflicts((current) => new Set([...current, ...missingExternally]));
        setMissingNotes((current) => new Set([...current, ...missingExternally]));
      }
      setDrafts((previous) => {
        const merged: Record<string, NoteRecord> = {};
        for (const note of next.notes) {
          const current = previous[note.id];
          const isDirty = dirtyRef.current.has(note.id);
          if (current && isDirty) {
            merged[note.id] = current;
          } else {
            merged[note.id] = note;
          }
        }
        for (const id of missingExternally) {
          if (previous[id]) merged[id] = previous[id];
        }
        return merged;
      });
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const editDraft = (note: NoteRecord, patch: Partial<NoteRecord>) => {
    setDrafts((previous) => ({ ...previous, [note.id]: { ...note, ...patch } }));
    setDirty((previous) => new Set(previous).add(note.id));
  };

  const saveNote = useCallback(async (note: NoteRecord, overwrite = false) => {
    if (conflicts.has(note.id) && !overwrite) return;
    try {
      const saved = await window.workspace.saveNote(note);
      savedRef.current[note.id] = saved;
      setDrafts((current) => {
        const latest = current[note.id];
        if (latest && sameContent(latest, note)) return { ...current, [note.id]: saved };
        return current;
      });
      setDirty((current) => {
        const next = new Set(current);
        if (sameContent(draftsRef.current[note.id] || note, note)) next.delete(note.id);
        return next;
      });
      if (overwrite) setConflicts((current) => without(current, note.id));
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  }, [conflicts]);

  /** Adds a note that was just written to disk, before the next refresh picks it up. */
  const addSavedNote = (note: NoteRecord) => {
    setDrafts((current) => ({ ...current, [note.id]: note }));
    savedRef.current[note.id] = note;
  };

  /** Drops local edits and takes the version that is on disk now. */
  const loadExternalVersion = (id: string) => {
    const remote = snapshot.notes.find((item) => item.id === id);
    if (remote) {
      setDrafts((current) => ({ ...current, [remote.id]: remote }));
      savedRef.current[remote.id] = remote;
      setDirty((current) => without(current, remote.id));
    }
    setConflicts((current) => without(current, id));
  };

  /** Replaces a note that vanished from disk with the recovered copy saved under a new id. */
  const replaceMissingNote = (missingId: string, recovered: NoteRecord) => {
    savedRef.current[recovered.id] = recovered;
    setDrafts((current) => ({ ...current, [recovered.id]: recovered }));
    setDirty((current) => without(current, missingId));
    setConflicts((current) => without(current, missingId));
    setMissingNotes((current) => without(current, missingId));
  };

  /** Moves the drafts of a renamed or deleted project's notes to their new project. */
  const moveProjectNotes = (fromName: string, toName: string) => {
    const affected = snapshot.notes.filter((note) => note.project === fromName && !note.deleted);
    for (const note of affected) {
      const saved = savedRef.current[note.id];
      if (saved) savedRef.current[note.id] = { ...saved, project: toName };
    }
    setDrafts((current) => {
      const next = { ...current };
      for (const note of affected) {
        if (next[note.id]) next[note.id] = { ...next[note.id], project: toName };
      }
      return next;
    });
  };

  return {
    snapshot,
    drafts,
    rootSelected,
    loading,
    setLoading,
    dirty,
    conflicts,
    missingNotes,
    refresh,
    editDraft,
    saveNote,
    addSavedNote,
    loadExternalVersion,
    replaceMissingNote,
    moveProjectNotes,
  };
}
