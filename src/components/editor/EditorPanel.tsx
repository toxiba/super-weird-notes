import Editor from "@monaco-editor/react";
import type { editor as MonacoEditorApi } from "monaco-editor";
import type { NoteRecord, Snapshot } from "../../../electron/types";
import { formatDate } from "../../lib/dates";
import { EditorTabs } from "./EditorTabs";
import { MetadataEditor } from "./MetadataEditor";

export function EditorPanel(props: {
  note: NoteRecord;
  snapshot: Snapshot;
  tabs: string[];
  drafts: Record<string, NoteRecord>;
  selectedId: string | null;
  dirty: boolean;
  conflict: boolean;
  missing: boolean;
  detailsCollapsed: boolean;
  editorOptions: MonacoEditorApi.IEditorOptions;
  editorBodyHeight: number;
  onSelectTab: (id: string) => void;
  onHideResults: () => void;
  onCloseTab: (id: string) => void;
  onEditOptions: () => void;
  onToggleDetails: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onRecover: () => void;
  onLoadExternal: () => void;
  onOverwrite: () => void;
  onChange: (patch: Partial<NoteRecord>) => void;
  onOpenExternal: (url: string) => void;
  onEditorMount: (editor: MonacoEditorApi.IStandaloneCodeEditor) => void;
}) {
  const { note: activeNote, snapshot, detailsCollapsed, editorBodyHeight, onChange } = props;
  return (
    <section className="editor-panel">
      <div className="editor-toolbar">
        <EditorTabs tabs={props.tabs} drafts={props.drafts} selectedId={props.selectedId} onSelect={props.onSelectTab} onHideResults={props.onHideResults} onClose={props.onCloseTab} />
        <div className="editor-actions">
          {activeNote.deleted
            ? <span className="save-indicator">In Trash</span>
            : props.dirty
              ? <span className="save-indicator"><i /> {props.conflict ? "Conflict" : "Saving…"}</span>
              : <span className="save-indicator saved"><i /> Saved</span>}
              {!activeNote.deleted && <button className="icon-button" onClick={props.onEditOptions} title="Editor options" aria-label="Editor options">⚙</button>}
          {!activeNote.deleted && <button className={`icon-button ${detailsCollapsed ? "pressed" : ""}`} onClick={props.onToggleDetails} title={`${detailsCollapsed ? "Show" : "Hide"} note details`} aria-label={`${detailsCollapsed ? "Show" : "Hide"} note details`} aria-pressed={!detailsCollapsed}>{detailsCollapsed ? "▤" : "▱"}</button>}
          {activeNote.deleted
            ? <button className="secondary-button restore-button" onClick={props.onRestore}>Restore note</button>
            : <button className="icon-button danger-text" onClick={props.onDelete} title="Move note to Trash">⌑</button>}
        </div>
      </div>
      {props.conflict && <div className="conflict-banner"><span>{props.missing ? "This note was moved or removed outside Super Weird Notes. Your edits are safe locally." : "This note changed outside Super Weird Notes. Your edits are safe locally."}</span>
        {props.missing
          ? <button onClick={props.onRecover}>Save as a new note</button>
          : <>
            <button onClick={props.onLoadExternal}>Load external version</button>
            <button onClick={props.onOverwrite}>Overwrite with my edits</button>
          </>}
      </div>}
      <div className="editor-scroll">
        <div className="note-heading">
          <span className="editor-project">{activeNote.project} <span>·</span> {formatDate(activeNote.createdAt)}</span>
          {activeNote.fileNameMismatch && <div className="filename-warning">The filename was changed outside the app. The stored title and external filename are both preserved.</div>}
          <input className="title-input" disabled={activeNote.deleted} value={activeNote.title} onChange={(event) => onChange({ title: event.target.value })} aria-label="Note title" />
          {!detailsCollapsed && <>
            <div className="metadata-inline">
              <label className="metadata-label" htmlFor="note-type">TYPE</label>
              <select id="note-type" className="type-select" disabled={activeNote.deleted} value={activeNote.type} onChange={(event) => onChange({ type: event.target.value })}>
                <option value="">Unclassified</option>
                {activeNote.type && !snapshot.noteTypes.includes(activeNote.type) && <option value={activeNote.type}>{activeNote.type}</option>}
                {snapshot.noteTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <label className="metadata-label status-label" htmlFor="note-status">STATUS</label>
              <select id="note-status" className="status-select" disabled={activeNote.deleted} value={activeNote.status} onChange={(event) => onChange({ status: event.target.value as NoteRecord["status"] })}>
                <option>Active</option><option>Completed</option><option>Archived</option>
              </select>
            </div>
            <MetadataEditor note={activeNote} projects={snapshot.projects} knownTags={[...new Set(snapshot.notes.flatMap((item) => item.tags))]} readOnly={activeNote.deleted} onOpenExternal={props.onOpenExternal} onChange={onChange} />
          </>}
        </div>
        {!activeNote.deleted && <div className="body-toolbar">
          <span>NOTE BODY</span>
        </div>}
        <div className="monaco-editor-container" style={{ height: editorBodyHeight }}>
          <Editor
            height={editorBodyHeight}
            language="plaintext"
            theme="vs-dark"
            value={activeNote.body}
            onMount={props.onEditorMount}
            onChange={(value) => onChange({ body: value ?? "" })}
            options={{ ...props.editorOptions, readOnly: activeNote.deleted }}
          />
        </div>
      </div>
    </section>
  );
}
