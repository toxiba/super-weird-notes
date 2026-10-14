import type { NoteRecord } from "../../../electron/types";

export function LinkEditor({ title, links, readOnly, onOpen, onAdd, onEdit, onRemove }: {
  title: string;
  links: NoteRecord["prs"];
  readOnly: boolean;
  onOpen: (url: string) => void;
  onAdd: () => void;
  onEdit: (index: number, key: "label" | "url", value: string) => void;
  onRemove: (index: number) => void;
}) {
  return <div className="link-editor"><div className="field-label link-title">{title}<button disabled={readOnly} onClick={onAdd}>＋ Add</button></div>
    {links.map((link, index) => <div className="link-row" key={`${title}-${index}`}><input disabled={readOnly} value={link.label} onChange={(event) => onEdit(index, "label", event.target.value)} placeholder="Label" /><input disabled={readOnly} value={link.url} onChange={(event) => onEdit(index, "url", event.target.value)} placeholder="https://…" /><button className="open-link" disabled={!/^https?:\/\//i.test(link.url)} onClick={() => onOpen(link.url)} title="Open link in browser">↗</button><button disabled={readOnly} onClick={() => onRemove(index)}>×</button></div>)}
  </div>;
}
