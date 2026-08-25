import { Download, FileText } from 'lucide-react';
import { marked } from 'marked';
import { useSession } from '../store';
import { Panel } from './Panel';

export function StudyPack({
  busy,
  tab,
  onTab,
}: {
  busy: boolean;
  tab: 'write' | 'preview';
  onTab: (tab: 'write' | 'preview') => void;
}) {
  const notes = useSession((s) => s.notes);
  const sessionId = useSession((s) => s.sessionId);
  const setNotes = useSession((s) => s.setNotes);

  function download() {
    if (!notes) return;
    const url = URL.createObjectURL(new Blob([notes], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'study-pack.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Panel
      label="study pack"
      hint={sessionId ? `session ${sessionId.slice(-6)} saved` : 'generated markdown'}
      className="study-panel"
    >
      <div className="tabs">
        <button className={tab === 'write' ? 'tab-active' : ''} onClick={() => onTab('write')}>
          Write
        </button>
        <button className={tab === 'preview' ? 'tab-active' : ''} onClick={() => onTab('preview')}>
          Preview
        </button>
        <span className="tab-file">
          <FileText size={13} /> study-pack.md
        </span>
        <button
          className="tab-action"
          onClick={download}
          disabled={!notes || busy}
          title="Download markdown file"
          style={{ marginLeft: 16 }}
        >
          <Download size={13} /> download .md
        </button>
      </div>
      {tab === 'write' ? (
        <textarea
          className="markdown-editor"
          aria-label="Markdown study pack"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Your generated study pack will appear here."
        />
      ) : notes ? (
        <article className="markdown-preview" dangerouslySetInnerHTML={{ __html: marked(notes) }} />
      ) : (
        <div className="markdown-preview">Nothing to preview yet.</div>
      )}
    </Panel>
  );
}