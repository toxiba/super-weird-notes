import Editor from "@monaco-editor/react";

export function EditorOptionsDialog({ draft, error, onDraftChange, onClose, onApply }: {
  draft: string;
  error: string;
  onDraftChange: (value: string) => void;
  onClose: () => void;
  onApply: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <section className="editor-options-dialog" role="dialog" aria-modal="true" aria-labelledby="editor-options-title">
        <div className="modal-heading">
          <div><p className="eyebrow">MONACO EDITOR</p><h2 id="editor-options-title">Editor options</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close editor options">×</button>
        </div>
        <div className="editor-options-content">
          <div className="editor-options-monaco"><Editor
              height="100%"
              language="json"
              theme="vs-dark"
              value={draft}
              onChange={(value) => onDraftChange(value ?? "")}
              options={{ automaticLayout: true, fixedOverflowWidgets: true, minimap: { enabled: false }, lineNumbers: "on", fontSize: 12, tabSize: 2 }}
            /></div>
          {error && <p className="project-dialog-error" role="alert">{error}</p>}
          <p className="editor-options-note">readOnly is controlled by whether a note is in Trash.</p>
        </div>
        <div className="modal-footer"><span>Saved on this device</span><div><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={onApply}>Apply options</button></div></div>
      </section>
    </div>
  );
}
