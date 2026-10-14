import { useState } from "react";
import type { NoteRecord, ProjectRecord } from "../../../electron/types";
import { LinkEditor } from "./LinkEditor";

type LinkField = "prs" | "docs";

export function MetadataEditor({ note, projects, knownTags, readOnly, onOpenExternal, onChange }: {
  note: NoteRecord;
  projects: ProjectRecord[];
  knownTags: string[];
  readOnly: boolean;
  onOpenExternal: (url: string) => void;
  onChange: (patch: Partial<NoteRecord>) => void;
}) {
  const [tagInput, setTagInput] = useState("");
  const addLink = (field: LinkField) => onChange({ [field]: [...note[field], { label: "", url: "" }] });
  const editLink = (field: LinkField, index: number, key: "label" | "url", value: string) => {
    const links = note[field].map((item, i) => i === index ? { ...item, [key]: value } : item);
    onChange({ [field]: links });
  };
  const removeLink = (field: LinkField, index: number) => onChange({ [field]: note[field].filter((_item, i) => i !== index) });
  const addBranch = () => onChange({ branches: [...note.branches, { name: "", from: "", repo: "" }] });
  const editBranch = (index: number, key: "name" | "from" | "repo", value: string) =>
    onChange({ branches: note.branches.map((item, i) => i === index ? { ...item, [key]: value } : item) });
  const removeBranch = (index: number) => onChange({ branches: note.branches.filter((_item, i) => i !== index) });
  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, "");
    if (tag && !note.tags.includes(tag)) onChange({ tags: [...note.tags, tag] });
    setTagInput("");
  };
  return (
    <div className="metadata-grid">
      <label className="field-label">PROJECT
        <select disabled={readOnly} value={note.project} onChange={(event) => onChange({ project: event.target.value })}>{projects.map((project) => <option key={project.name}>{project.name}</option>)}</select>
      </label>
      <label className="field-label">AZURE WORK ITEM
        <input disabled={readOnly} value={note.workItemId} onChange={(event) => onChange({ workItemId: event.target.value })} placeholder="e.g. 123456" />
      </label>
      <div className="branch-fields">
        <div className="field-label link-title">BRANCHES<button disabled={readOnly} onClick={addBranch}>＋ Add</button></div>
        {note.branches.map((branch, index) => <div className="link-row" key={`branch-${index}`}><input disabled={readOnly} value={branch.name} onChange={(event) => editBranch(index, "name", event.target.value)} placeholder="feature/my-branch" /><input disabled={readOnly} value={branch.from} onChange={(event) => editBranch(index, "from", event.target.value)} placeholder="From branch, e.g. main" /><input disabled={readOnly} value={branch.repo} onChange={(event) => editBranch(index, "repo", event.target.value)} placeholder="Repo, e.g. org/repo" /><button disabled={readOnly} onClick={() => removeBranch(index)} title="Remove branch">×</button></div>)}
      </div>
      <div className="field-label tags-field">TAGS
        <div className="tags-input">{note.tags.map((tag) => <button className="tag-chip" key={tag} disabled={readOnly} onClick={() => onChange({ tags: note.tags.filter((item) => item !== tag) })}>{tag} ×</button>)}<input disabled={readOnly} value={tagInput} list="existing-tags" onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addTag(); } }} onBlur={addTag} placeholder="Add tag…" /><datalist id="existing-tags">{knownTags.map((tag) => <option key={tag}>{tag}</option>)}</datalist></div>
      </div>
      <div className="link-fields">
        <LinkEditor title="PULL REQUESTS" links={note.prs} readOnly={readOnly} onOpen={onOpenExternal} onAdd={() => addLink("prs")} onEdit={(index, key, value) => editLink("prs", index, key, value)} onRemove={(index) => removeLink("prs", index)} />
        <LinkEditor title="DOCUMENTATION" links={note.docs} readOnly={readOnly} onOpen={onOpenExternal} onAdd={() => addLink("docs")} onEdit={(index, key, value) => editLink("docs", index, key, value)} onRemove={(index) => removeLink("docs", index)} />
      </div>
    </div>
  );
}
