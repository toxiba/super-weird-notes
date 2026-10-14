import type { editor as MonacoEditorApi } from "monaco-editor";
import { useState } from "react";
import { defaultEditorOptions } from "../lib/monaco";

const storageKey = "superWeirdNotes.editorOptions";

/** Monaco options for the note editor, saved on this device, plus the JSON dialog that edits them. */
export function useEditorOptions() {
  const [editorOptions, setEditorOptions] = useState<MonacoEditorApi.IEditorOptions>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return defaultEditorOptions;
      const parsed = JSON.parse(saved) as Record<string, unknown>;
      const { readOnly: _readOnly, ...options } = parsed;
      return options as MonacoEditorApi.IEditorOptions;
    } catch {
      return defaultEditorOptions;
    }
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const openDialog = () => {
    setDraft(JSON.stringify(editorOptions, null, 2));
    setError("");
    setDialogOpen(true);
  };

  const closeDialog = () => setDialogOpen(false);

  const apply = () => {
    try {
      const parsed: unknown = JSON.parse(draft);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Options must be a JSON object.");
      }
      if (Object.hasOwn(parsed, "readOnly")) {
        throw new Error("readOnly is managed by note state and cannot be customized.");
      }
      const options = parsed as MonacoEditorApi.IEditorOptions;
      localStorage.setItem(storageKey, JSON.stringify(options));
      setEditorOptions(options);
      setDialogOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  };

  return { editorOptions, dialogOpen, draft, setDraft, error, openDialog, closeDialog, apply };
}
