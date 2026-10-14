export function WelcomeScreen({ message, onChooseRoot }: { message: string; onChooseRoot: () => void }) {
  return (
    <main className="welcome-screen">
      <div className="brand-mark">s.</div>
      <p className="eyebrow">YOUR LOCAL WORKSPACE</p>
      <h1>All your work notes,<br />in one place.</h1>
      <p className="welcome-copy">A calm, searchable home for task notes, project links and the little details you’ll need later.</p>
      <button className="primary-button welcome-button" onClick={onChooseRoot}>Choose library folder <span>→</span></button>
      <p className="subtle">Your notes stay on this device as ordinary text files.</p>
      {message && <p className="error-message">{message}</p>}
    </main>
  );
}
