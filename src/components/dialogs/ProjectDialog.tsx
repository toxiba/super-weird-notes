import type { ProjectRecord } from "../../../electron/types";
import { normalizeProjectName, validateProjectName } from "../../lib/projectNames";
import type { ProjectDialogState } from "../../types";

export function ProjectDialog({ dialog, projects, error, onChange, onClose, onSubmit }: {
  dialog: ProjectDialogState;
  projects: ProjectRecord[];
  error: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const projectNameValue = dialog.mode !== "delete" ? dialog.value : "";
  const normalizedProjectName = normalizeProjectName(projectNameValue);
  const projectNameError = dialog.mode !== "delete"
    ? validateProjectName(projectNameValue, dialog.project?.name || null, projects)
    : "";
  return (
    <div className="modal-backdrop">
      <section className="project-dialog" role="dialog" aria-modal="true" aria-labelledby="project-dialog-title">
        <div className="modal-heading"><div><p className="eyebrow">PROJECTS</p><h2 id="project-dialog-title">{dialog.mode === "create" ? "New project" : dialog.mode === "rename" ? "Rename project" : "Delete project"}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>
        {dialog.mode === "delete" ? <>
          <div className="project-dialog-content">
            <p>Delete <strong>{dialog.project?.name}</strong>? {dialog.project?.notes ? `${dialog.project.notes} note${dialog.project.notes === 1 ? "" : "s"} will move to Unassigned.` : "No notes need to be moved."}</p>
            {error && <p className="project-dialog-error" role="alert">{error}</p>}
          </div>
          <div className="modal-footer"><span>Notes are kept</span><div><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button delete-project-button" onClick={onSubmit}>Delete project</button></div></div>
        </> : <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
          <div className="project-dialog-content">
            <label className="project-name-label" htmlFor="project-name">Project name</label>
            <input id="project-name" autoFocus value={dialog.value} onChange={(event) => onChange(event.target.value)} aria-invalid={!!projectNameError} />
            {normalizedProjectName !== dialog.value && normalizedProjectName && <p className="project-name-preview">Saved as <strong>{normalizedProjectName}</strong></p>}
            {error && <p className="project-dialog-error" role="alert">{error}</p>}
            {!error && projectNameError && <p className="project-dialog-error" role="status">{projectNameError}</p>}
          </div>
          <div className="modal-footer"><span>{dialog.mode === "create" ? "Create and open project" : "Notes stay in this project"}</span><div><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!!projectNameError || !normalizedProjectName} type="submit">{dialog.mode === "create" ? "Create project" : "Save name"}</button></div></div>
        </form>}
      </section>
    </div>
  );
}
