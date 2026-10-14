import { useState } from "react";
import type { ProjectRecord } from "../../../electron/types";

export function ProjectList({ projects, projectFilter, openMenu, onToggleMenu, onSelect, onCreateProject, onRename, onCreateNote, onDelete }: {
  projects: ProjectRecord[];
  projectFilter: string | null;
  openMenu: string | null;
  onToggleMenu: (name: string) => void;
  onSelect: (name: string) => void;
  onCreateProject: () => void;
  onRename: (project: ProjectRecord) => void;
  onCreateNote: (name: string) => void;
  onDelete: (project: ProjectRecord) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="side-section projects-section">
      <div className="section-label projects-heading">
        <button className="projects-section-toggle" onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed} aria-label={`${collapsed ? "Expand" : "Collapse"} Projects`} title={`${collapsed ? "Expand" : "Collapse"} Projects`}>
          <span>PROJECTS</span>
        </button>
        <div className="projects-heading-actions">
          <button className="tiny-action" onClick={onCreateProject} title="New Project" aria-label="New project">＋</button>
          <button className="projects-section-toggle projects-chevron" onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed} aria-label={`${collapsed ? "Expand" : "Collapse"} Projects`} title={`${collapsed ? "Expand" : "Collapse"} Projects`}>
            <span className="tiny-muted">{collapsed ? "›" : "⌄"}</span>
          </button>
        </div>
      </div>
      {!collapsed && projects.map((project) => (
        <div className="project-row menu-row" key={project.name}>
          <button className={`nav-item project-item ${projectFilter === project.name ? "selected" : ""}`} onClick={() => onSelect(project.name)}>
            <span className={`project-dot ${project.name === "Unassigned" ? "neutral" : ""}`} />
            <span className="truncate">{project.name}</span><span className="nav-count">{project.notes ? `(${project.notes})` : ""}</span>
          </button>
          <button className="more-button" title={`Actions for ${project.name}`} aria-label={`Actions for ${project.name}`} aria-haspopup="menu" aria-expanded={openMenu === project.name} onClick={() => onToggleMenu(project.name)}>···</button>
          {openMenu === project.name && <div className="project-menu" role="menu">
            {project.name !== "Unassigned" && <>
              <button role="menuitem" onClick={() => onRename(project)}>Rename</button>
              <button role="menuitem" onClick={() => onCreateNote(project.name)}>Create note</button>
            </>}
            {project.name !== "Unassigned" && <button className="danger-text" role="menuitem" onClick={() => onDelete(project)}>Delete project</button>}
          </div>}
        </div>
      ))}
    </div>
  );
}
