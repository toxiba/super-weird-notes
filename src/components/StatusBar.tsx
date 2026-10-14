import type { Snapshot } from "../../electron/types";

export function StatusBar({ snapshot, onOpenLibrary }: { snapshot: Snapshot; onOpenLibrary: () => void }) {
  return (
    <footer className="statusbar"><span><i className="online-dot" /> Local library</span><span>{snapshot.projects.length} projects</span><span>{snapshot.notes.filter((note) => !note.deleted).length} notes</span><button className="statusbar-path" onClick={onOpenLibrary} title={`Open library folder: ${snapshot.root}`}>{snapshot.root}</button></footer>
  );
}
