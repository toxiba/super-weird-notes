import type { NoteRecord } from "../../../electron/types";

export function EditorTabs({ tabs, drafts, selectedId, onSelect, onHideResults, onClose }: {
  tabs: string[];
  drafts: Record<string, NoteRecord>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHideResults: () => void;
  onClose: (id: string) => void;
}) {
  return (
    <div className="tab-strip">
      {tabs.map((id) => {
        const note = drafts[id];
        if (!note) return null;
        return <div className={`editor-tab ${id === selectedId ? "current" : ""}`} key={id}>
          <button className="tab-title" title={`${note.title} (${note.project})`} onClick={() => onSelect(id)} onDoubleClick={onHideResults} aria-label={`Open ${note.title} in ${note.project}`}><span className="tab-note-title">{note.title}</span><span className="tab-project-title">({note.project})</span></button>
          <button className="tab-close" onClick={() => onClose(id)} aria-label={`Close ${note.title}`}>×</button>
        </div>;
      })}
    </div>
  );
}
