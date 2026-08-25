import { useEffect, useState } from 'react';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { Eraser, Loader2, X } from 'lucide-react';
import { useDrawerChat } from '../../hooks/useDrawerChat';
import { ConfirmDialog } from '../ConfirmDialog';
import { SessionThread } from './SessionThread';

function DrawerContent({
  sessionId,
  title,
  onClose,
}: {
  sessionId: string;
  title?: string;
  onClose: () => void;
}) {
  const {
    runtime,
    regenerate,
    deleteMessage,
    isRunning,
    error,
    loaded,
    hasContext,
    clearChat,
  } = useDrawerChat(sessionId);
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <>
      <header className="drawer-head">
        <span className="drawer-eyebrow">/ ask</span>
        <strong className="drawer-title">
          {title || 'Ask about this session'}
        </strong>
        <span className="drawer-sub">answers only from this session</span>
        <button
          className="icon-button drawer-clear"
          onClick={() => setConfirmClear(true)}
          title="Clear all chats in this session"
          disabled={isRunning}
        >
          <Eraser size={15} />
        </button>
        <button className="icon-button" onClick={onClose} title="Close">
          <X size={16} />
        </button>
      </header>
      {!loaded ? (
        <div className="chat-drawer-body">
          <p className="chat-welcome">
            <Loader2 size={13} className="spin" style={{ verticalAlign: -2 }} />{' '}
            Loading chat…
          </p>
        </div>
      ) : (
        <div className="chat-drawer-body">
          {error && (
            <div className="error" role="alert">
              <X size={15} /> {error}
            </div>
          )}
          <AssistantRuntimeProvider runtime={runtime}>
            <SessionThread
              hasContext={hasContext}
              isRunning={isRunning}
              onRegenerate={regenerate}
              onDeleteMessage={deleteMessage}
            />
          </AssistantRuntimeProvider>
        </div>
      )}
      <ConfirmDialog
        open={confirmClear}
        title="Clear all chats?"
        message="Delete every message in this session's chat. The transcript and study pack are kept."
        confirmLabel="clear"
        onConfirm={() => {
          clearChat();
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </>
  );
}

/**
 * Full-screen drawer opened from a thread's "ask" button. The chat inside is
 * scoped to that session only and never touches the active workspace session.
 */
export default function ChatDrawer({
  sessionId,
  title,
  onClose,
}: {
  sessionId: string;
  title?: string;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setTimeout(onClose, 260);
    }, 0);
  }

  return (
    <div className={`chat-drawer ${open ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Session chat">
      <DrawerContent
        key={sessionId}
        sessionId={sessionId}
        title={title}
        onClose={close}
      />
    </div>
  );
}