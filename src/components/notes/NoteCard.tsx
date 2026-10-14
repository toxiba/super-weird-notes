import type { NoteRecord } from "../../../electron/types";
import { formatDate } from "../../lib/dates";

export function NoteCard({ note, active, onOpen }: { note: NoteRecord; active: boolean; onOpen: () => void }) {
  return (
    <button className={`note-card ${active ? "active" : ""} ${note.deleted ? "is-deleted" : ""}`} onClick={onOpen}>
      <div className="note-card-top"><span className="note-type">{note.type || "Unclassified"}</span><span className={`status-pill ${note.status.toLowerCase()}`}>{note.deleted ? "Deleted" : note.status}</span></div>
      <h3>{note.title}</h3>
      <p className="note-excerpt">{note.body.replace(/[#>*_`[\]()!-]/g, " ").replace(/\s+/g, " ").trim() || "No note content yet."}</p>
      <div className="note-card-bottom"><span className="project-tag">{note.project}</span>{note.workItemId && <span className="work-item">#{note.workItemId}</span>}<span className="card-date">{formatDate(note.createdAt)}</span></div>
    </button>
  );
}
