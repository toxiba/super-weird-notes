import type { NoteRecord, Snapshot } from "../../../electron/types";
import type { View } from "../../types";
import { NoteCard } from "./NoteCard";

export function NoteList(props: {
  snapshot: Snapshot;
  notes: NoteRecord[];
  view: View;
  projectFilter: string | null;
  typeFilter: string | null;
  statusFilter: string | null;
  dateFilter: string | null;
  selectedId: string | null;
  showHideButton: boolean;
  onHide: () => void;
  onTypeFilter: (value: string | null) => void;
  onStatusFilter: (value: string | null) => void;
  onClearProject: () => void;
  onClearDate: () => void;
  onOpenNote: (id: string) => void;
  onCreateNote: () => void;
}) {
  const { snapshot, view, projectFilter, typeFilter, statusFilter, dateFilter } = props;
  const notes = props.notes.filter((note) => typeFilter !== "__untyped" || !note.type);
  return (
    <section className="results-panel" id="results-panel">
      {props.showHideButton && <div className="results-panel-header">
        <button className="hide-results-button" onClick={props.onHide} title="Hide search results" aria-label="Hide search results">‹ Hide results</button>
      </div>}
      {view === "types" && !typeFilter && (
        <div className="type-cards">
          {snapshot.noteTypes.map((type) => {
            const count = snapshot.notes.filter((note) => note.type === type && !note.deleted).length;
            return <button key={type} className="type-card" onClick={() => props.onTypeFilter(type)}>
              <span className="type-card-icon">◇</span><strong>{type}</strong><span>{count} notes</span>
            </button>;
          })}
        </div>
      )}
      <div className="filter-row">
        {typeFilter && typeFilter !== "__untyped" && <button className="filter-chip" onClick={() => props.onTypeFilter(null)}>{typeFilter} ×</button>}
        {typeFilter === "__untyped" && <button className="filter-chip" onClick={() => props.onTypeFilter(null)}>Unclassified ×</button>}
        <select aria-label="Filter by status" value={statusFilter || ""} onChange={(event) => props.onStatusFilter(event.target.value || null)}>
          <option value="">Any status</option><option>Active</option><option>Completed</option><option>Archived</option>
        </select>
        {projectFilter && <button className="filter-chip" onClick={props.onClearProject}>{projectFilter} ×</button>}
        {dateFilter && <button className="filter-chip" onClick={props.onClearDate}>{dateFilter.replaceAll("/", " / ")} ×</button>}
      </div>
      {view !== "types" || typeFilter ? (
        <div className="result-list">
          {notes.map((note) => (
            <NoteCard key={`${note.id}-${note.deleted}`} note={note} active={props.selectedId === note.id} onOpen={() => props.onOpenNote(note.id)} />
          ))}
          {!notes.length && <div className="empty-state"><div className="empty-icon">⌕</div><h3>No notes found</h3><p>Try another search or create a note to capture something.</p><button className="secondary-button" onClick={props.onCreateNote}>＋ Create a note</button></div>}
        </div>
      ) : null}
    </section>
  );
}
