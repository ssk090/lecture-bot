import { useEffect, useRef, useState } from 'react';
import {
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from '@assistant-ui/react';
import { getSession, streamChat, updateSession, type ChatMessage } from '../api';

function toThreadMessage(message: ChatMessage): ThreadMessageLike {
  return { role: message.role, content: [{ type: 'text', text: message.content }] };
}

/**
 * Normalizes ordering artifacts from older saves (e.g. a duplicated user turn
 * left by an early regenerate bug) so each reply sits right after its
 * question. Drops consecutive duplicate user messages; joins a bare user turn
 * with a following assistant reply.
 */
function sanitizeChat(chat: ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const message of chat) {
    const last = out[out.length - 1];
    if (
      message.role === 'user' &&
      last?.role === 'user' &&
      last.content === message.content
    ) {
      continue;
    }
    out.push(message);
  }
  return out;
}

/**
 * Streams a session-scoped answer and paints it progressively. Even when the
 * server delivers the whole reply as one chunk, the drain throttle reveals it
 * over ~48 frames so the user always sees text stream in. Resolves with the
 * canonical persisted chat.
 */
async function streamWithReveal(opts: {
  id: string;
  question: string;
  mode: 'ask' | 'regenerate';
  before: ChatMessage[];
  set: (next: (current: ChatMessage[]) => ChatMessage[]) => void;
}): Promise<ChatMessage[]> {
  let shown = '';
  let pending = '';
  let finished = false;
  let final: ChatMessage[] = [];
  const paint = () => opts.set(() => [...opts.before, { role: 'assistant', content: shown }]);
  const ticker = setInterval(() => {
    if (pending) {
      const step = Math.max(1, Math.ceil(pending.length / 48));
      shown += pending.slice(0, step);
      pending = pending.slice(step);
      paint();
    }
    if (finished && !pending) {
      clearInterval(ticker);
      opts.set(() => final);
    }
  }, 16);
  try {
    final = await streamChat(opts.id, opts.question, (delta) => {
      pending += delta;
    }, opts.mode);
    const full =
      [...final].reverse().find((m) => m.role === 'assistant')?.content ?? '';
    // Reveal only what is still missing from the answer. (Deltas already put
    // the text in `pending`, so appending here would double it.)
    pending = full.slice(shown.length);
    finished = true;
  } catch (error) {
    clearInterval(ticker);
    throw error;
  }
  return final;
}

/**
 * Stays scoped to one session id so the drawer never touches the active
 * workspace session (leaving unsaved edits alone).
 */
export function useDrawerChat(sessionId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hasContext, setHasContext] = useState(false);
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setError('');
    setMessages([]);
    getSession(sessionId)
      .then((session) => {
        if (cancelled) return;
        setMessages(sanitizeChat(session.chat ?? []));
        setHasContext(!!(session.transcript.trim() || session.notes.trim()));
        setLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load chat.');
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function generate(question: string, mode: 'ask' | 'regenerate') {
    if (isRunning) return;
    if (!hasContext) {
      setError('Add a transcript or study pack to this session before asking.');
      return;
    }
    const current = messagesRef.current;
    let before: ChatMessage[];
    if (mode === 'regenerate') {
      if (current[current.length - 1]?.role !== 'assistant') return;
      before = current.slice(0, -1);
      setMessages(before);
    } else {
      before = [...current, { role: 'user', content: question }];
      setMessages(before);
    }
    setIsRunning(true);
    setError('');
    try {
      const final = await streamWithReveal({
        id: sessionId,
        question,
        mode,
        before,
        set: setMessages,
      });
      setMessages(sanitizeChat(final));
    } catch (err) {
      setMessages(before);
      setError(err instanceof Error ? err.message : 'Chat failed.');
    } finally {
      setIsRunning(false);
    }
  }

  async function regenerate() {
    const current = messagesRef.current;
    const lastUser = [...current].reverse().find((m) => m.role === 'user');
    if (lastUser) await generate(lastUser.content, 'regenerate');
  }

  async function deleteMessage(role: 'user' | 'assistant', content: string) {
    if (isRunning) return;
    const current = messagesRef.current;
    const index = [...current].reverse().findIndex(
      (m) => m.role === role && m.content === content,
    );
    if (index === -1) return;
    const next = current.filter((_, i) => i !== current.length - 1 - index);
    setMessages(next);
    await updateSession(sessionId, { chat: next }).catch(() => {});
  }

  async function clearChat() {
    if (isRunning) return;
    setMessages([]);
    await updateSession(sessionId, { chat: [] }).catch(() => {});
  }

  const runtime = useExternalStoreRuntime<ChatMessage>({
    isRunning,
    messages,
    convertMessage: toThreadMessage,
    onNew: async (message: AppendMessage) => {
      const text =
        message.content[0]?.type === 'text' ? message.content[0].text : '';
      if (!text.trim()) return;
      await generate(text, 'ask');
    },
  });

  return { runtime, regenerate, deleteMessage, isRunning, error, loaded, hasContext, clearChat };
}