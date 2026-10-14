import type { ProjectRecord } from "../../../electron/types";

export function ImportDialog({ paths, projects, choices, onChoose, onCancel, onImport }: {
  paths: string[];
  projects: ProjectRecord[];
  choices: Record<string, string>;
  onChoose: (file: string, project: string) => void;
  onCancel: () => void;
  onImport: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <div className="import-dialog">
        <div className="modal-heading"><div><p className="eyebrow">SAFE COPY IMPORT</p><h2>Choose a Project for each note</h2><p>Original text files stay untouched. Copies are added to your library.</p></div><button className="icon-button" onClick={onCancel}>×</button></div>
        <div className="import-items">
          {paths.map((file) => <label className="import-item" key={file}><span className="import-file-icon">▤</span><span className="import-file-name" title={file}>{file.split(/[\\/]/).at(-1)}</span><select value={choices[file] || ""} onChange={(event) => onChoose(file, event.target.value)}><option value="">Choose Project…</option>{projects.map((project) => <option key={project.name}>{project.name}</option>)}</select></label>)}
        </div>
        <div className="modal-footer"><span>{paths.length} selected</span><div><button className="secondary-button" onClick={onCancel}>Cancel</button><button className="primary-button" disabled={paths.some((file) => !choices[file])} onClick={onImport}>Import notes</button></div></div>
      </div>
    </div>
  );
}
