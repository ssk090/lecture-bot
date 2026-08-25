export function AppHeader() {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">&gt;_</span>
        <span>lecture.bot</span>
        <span className="version">v0.4.2</span>
      </div>
      <div className="top-meta">
        <span className="status-dot" /> local session <span className="slash">/</span>{' '}
        no data leaves your browser
      </div>
    </header>
  );
}