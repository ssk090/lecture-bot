import { useMemo, useState } from 'react';
import { MessageCircle, Plus, Search, X } from 'lucide-react';
import type { Session } from '../api';
import { ConfirmDialog } from './ConfirmDialog';

export function ThreadSidebar({
  sessions,
  activeId,
  onNew,
  onOpen,
  onAsk,
  onDelete
}: {
  sessions: Session[];
  activeId: string | null;
  onNew: () => void;
  onOpen: (session: Session) => void;
  onAsk: (session: Session) => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Session | null>(null);
  const filtered = useMemo(
    () => sessions.filter((session) => session.title.toLowerCase().includes(query.toLowerCase())),
    [sessions, query]
  );

  return (
    <aside className="thread-sidebar" aria-label="Thread list">
      <div className="thread-head">
        <div>
          <p className="eyebrow">/ threads</p>
          <h2>Sessions</h2>
        </div>
        <button className="icon-button" onClick={onNew} title="New session">
          <Plus size={16} />
        </button>
      </div>
      <label className="thread-search">
        <Search size={14} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search sessions" />
      </label>
      <div className="thread-list">
        {filtered.map((session) => (
          <div className={`thread-item ${session.id === activeId ? 'is-active' : ''}`} key={session.id}>
            <button onClick={() => onOpen(session)}>
              <span>{session.title || 'New session'}</span>
              <small>{session.notes ? 'study pack saved' : session.transcript ? 'transcript only' : 'empty session'}</small>
            </button>
            <button className="thread-ask" onClick={() => onAsk(session)} title="Ask about this session">
              <MessageCircle size={14} />
            </button>
            <button className="delete-thread" onClick={() => setPendingDelete(session)} title="Delete session">
              <X size={14} />
            </button>
          </div>
        ))}
        {!filtered.length && <p className="empty-thread">No saved sessions yet.</p>}
      </div>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete session?"
        message={`This permanently deletes "${pendingDelete?.title ?? 'this session'}" and its saved study pack. This cannot be undone.`}
        confirmLabel="delete"
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </aside>
  );
}
