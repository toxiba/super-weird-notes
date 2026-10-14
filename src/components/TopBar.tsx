export function TopBar({ search, onSearchChange, onHome, onNewNote, onChangeLibrary }: {
  search: string;
  onSearchChange: (value: string) => void;
  onHome: () => void;
  onNewNote: () => void;
  onChangeLibrary: () => void;
}) {
  return (
    <header className="topbar">
      <button className="wordmark" onClick={onHome} aria-label="All notes">
        <span className="brand-mark small">s.</span><span>Super Weird Notes</span>
      </button>
      <div className="global-search">
        <span className="search-icon">⌕</span>
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search notes, work items, branches…" />
        {search && <button className="clear-search-button" onClick={() => onSearchChange("")} title="Clear search" aria-label="Clear search">×</button>}
        <kbd>⌘ K</kbd>
      </div>
      <button className="icon-button new-note-button" onClick={onNewNote} title="New note" aria-label="New note">＋</button>
      <button className="icon-button" onClick={onChangeLibrary} title="Change library folder">⚙</button>
      <div className="avatar">M</div>
    </header>
  );
}
