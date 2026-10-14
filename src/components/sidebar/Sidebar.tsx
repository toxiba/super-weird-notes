import { useState } from "react";
import type { ProjectRecord, Snapshot } from "../../../electron/types";
import type { SidebarSection, View } from "../../types";
import { DateTree } from "./DateTree";
import { ProjectList } from "./ProjectList";

export function Sidebar(props: {
  snapshot: Snapshot;
  view: View;
  projectFilter: string | null;
  typeFilter: string | null;
  statusFilter: string | null;
  dateFilter: string | null;
  activeBrowseSection: SidebarSection | null;
  expandedSidebarSection: SidebarSection | null;
  openMenu: string | null;
  onToggleMenu: (name: string) => void;
  onSelectAll: () => void;
  onToggleBrowseSection: (section: SidebarSection) => void;
  onSelectDate: (value: string | null) => void;
  onSelectType: (value: string | null) => void;
  onShowTrash: () => void;
  onEmptyTrash: () => void;
  onSelectProject: (name: string) => void;
  onCreateProject: () => void;
  onRenameProject: (project: ProjectRecord) => void;
  onCreateNote: (project: string) => void;
  onDeleteProject: (project: ProjectRecord) => void;
  onOpenLibrary: () => void;
  onImport: () => void;
}) {
  const { snapshot, view, projectFilter, typeFilter, statusFilter, dateFilter, activeBrowseSection, expandedSidebarSection, openMenu } = props;
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);
  const allNotesCount = snapshot.notes.filter((note) => !note.deleted).length;
  const untypedNotesCount = snapshot.notes.filter((note) => !note.deleted && !note.type.trim()).length;
  const trashedNotesCount = snapshot.notes.filter((note) => note.deleted).length;

  return (
    <aside className="sidebar">
      <div className="side-scroll">
        <div className="side-section">
          <button className="section-label section-toggle" onClick={() => setWorkspaceCollapsed(!workspaceCollapsed)} aria-expanded={!workspaceCollapsed}>
            WORKSPACE <span className="tiny-muted">{workspaceCollapsed ? "›" : "⌄"}</span>
          </button>
          {!workspaceCollapsed && <div className="workspace-nav-items">
            <button className={`nav-item ${view === "all" && !projectFilter && !typeFilter && !statusFilter && !dateFilter ? "selected" : ""}`} onClick={props.onSelectAll}>
              <span className="nav-icon">▤</span> All notes <span className="nav-count">({allNotesCount})</span>
            </button>
            <button className={`nav-item ${activeBrowseSection === "dates" ? "selected" : ""}`} onClick={() => props.onToggleBrowseSection("dates")} aria-expanded={expandedSidebarSection === "dates"}>
              <span className="nav-icon">◷</span> By date <span className="nav-disclosure">{expandedSidebarSection === "dates" ? "⌄" : "›"}</span>
            </button>
            {expandedSidebarSection === "dates" && <div className="sidebar-subnav"><DateTree notes={snapshot.notes.filter((note) => !note.deleted)} current={dateFilter} onSelect={props.onSelectDate} /></div>}
            <button className={`nav-item ${activeBrowseSection === "types" ? "selected" : ""}`} onClick={() => props.onToggleBrowseSection("types")} aria-expanded={expandedSidebarSection === "types"}>
              <span className="nav-icon">◇</span> By type <span className="nav-disclosure">{expandedSidebarSection === "types" ? "⌄" : "›"}</span>
            </button>
            {expandedSidebarSection === "types" && <div className="sidebar-subnav type-subnav">
              {snapshot.noteTypes.map((type) => {
                const count = snapshot.notes.filter((note) => note.type === type && !note.deleted).length;
                return <button key={type} className={`nav-item ${typeFilter === type ? "selected" : ""}`} onClick={() => props.onSelectType(typeFilter === type ? null : type)}>
                  <span className="type-bullet" />{type}<span className="nav-count">{count ? `(${count})` : ""}</span>
                </button>;
              })}
              <button className={`nav-item ${typeFilter === "__untyped" ? "selected" : ""}`} onClick={() => props.onSelectType("__untyped")}>
                Unclassified <span className="nav-count">{untypedNotesCount ? `(${untypedNotesCount})` : ""}</span>
              </button>
            </div>}
            <div className="project-row menu-row">
              <button className={`nav-item project-item ${view === "trash" ? "selected" : ""}`} onClick={props.onShowTrash}>
                <span className="nav-icon">⌑</span> Trash <span className="nav-count">{trashedNotesCount ? `(${trashedNotesCount})` : ""}</span>
              </button>
              {snapshot.notes.some((note) => note.deleted) && <>
                <button className="more-button" title="Trash actions" aria-label="Trash actions" aria-haspopup="menu" aria-expanded={openMenu === "__trash"} onClick={() => props.onToggleMenu("__trash")}>···</button>
                {openMenu === "__trash" && <div className="project-menu" role="menu"><button className="danger-text" role="menuitem" onClick={props.onEmptyTrash}>Empty Trash</button></div>}
              </>}
            </div>
          </div>}
        </div>

        <ProjectList
          projects={snapshot.projects}
          projectFilter={projectFilter}
          openMenu={openMenu}
          onToggleMenu={props.onToggleMenu}
          onSelect={props.onSelectProject}
          onCreateProject={props.onCreateProject}
          onRename={props.onRenameProject}
          onCreateNote={props.onCreateNote}
          onDelete={props.onDeleteProject}
        />
      </div>
      <div className="sidebar-bottom">
        <button className="library-location" onClick={props.onOpenLibrary} title={`Open library folder: ${snapshot.root}`} aria-label={`Open library folder ${snapshot.root}`}><span className="online-dot" /> Library <span>{snapshot.root.split(/[\\/]/).at(-1)}</span></button>
        <button className="import-link" onClick={props.onImport}>⇧ &nbsp;Import notes</button>
      </div>
    </aside>
  );
}
