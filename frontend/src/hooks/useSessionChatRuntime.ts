import { useState } from 'react';
import {
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from '@assistant-ui/react';
import { streamChat, updateSession, type ChatMessage } from '../api';
import { useSession } from '../store';

function toThreadMessage(message: ChatMessage): ThreadMessageLike {
  return { role: message.role, content: [{ type: 'text', text: message.content }] };
}

export function useSessionChatRuntime() {
  const chat = useSession((s) => s.chat);
  const setError = useSession((s) => s.setError);
  const [isRunning, setIsRunning] = useState(false);

  /**
   * Every async write is anchored to the session that was active when the
   * request started. If the user switches threads mid-flight, the store is
   * left untouched (the backend still persists into the right session doc).
   */
  async function generate(question: string, mode: 'ask' | 'regenerate') {
    const poster = useSession.getState();
    const id = poster.sessionId;
    if (!id) {
      setError('Select a session to chat with first.');
      return;
    }
    if (!poster.transcript.trim() && !poster.notes.trim()) {
      setError('Add a transcript or study pack to this session before asking.');
      return;
    }

    const current = poster.chat;
    let before: ChatMessage[];
    if (mode === 'regenerate') {
      if (current[current.length - 1]?.role !== 'assistant') return;
      before = current.slice(0, -1); // drop the previous answer, keep the user question
    } else {
      before = [...current, { role: 'user', content: question }];
      poster.setChat(before);
    }

    setIsRunning(true);
    setError('');
    const anchor = { id, before };

    // Paint deltas through a throttle so the answer always streams, even when
    // the LLM server delivers the whole reply in a single chunk.
    let shown = '';
    let pending = '';
    let finished = false;
    let final: ChatMessage[] = [];
    const paint = () => {
      const s = useSession.getState();
      if (s.sessionId !== anchor.id) return; // switched sessions, stop painting
      s.setChat([...anchor.before, { role: 'assistant', content: shown }]);
    };
    const ticker = setInterval(() => {
      if (pending) {
        const step = Math.max(1, Math.ceil(pending.length / 48));
        shown += pending.slice(0, step);
        pending = pending.slice(step);
        paint();
      }
      // drain whatever arrived late, then commit the canonical chat
      if (finished && !pending) {
        clearInterval(ticker);
        const s = useSession.getState();
        if (s.sessionId === anchor.id) s.setChat(final);
      }
    }, 16);

    try {
      final = await streamChat(
        id,
        question,
        (delta) => {
          pending += delta;
        },
        mode,
      );
      const full =
        [...final].reverse().find((m) => m.role === 'assistant')?.content ?? '';
      pending += full.slice(shown.length); // reveal any not-yet-shown tail
      finished = true;
    } catch (error) {
      clearInterval(ticker);
      const s = useSession.getState();
      if (s.sessionId === anchor.id) s.setChat(anchor.before);
      setError(error instanceof Error ? error.message : 'Chat failed.');
    } finally {
      setIsRunning(false);
    }
  }

  async function regenerate() {
    if (isRunning) return;
    const lastUser = [...useSession.getState().chat]
      .reverse()
      .find((m) => m.role === 'user');
    if (lastUser) await generate(lastUser.content, 'regenerate');
  }

  async function deleteMessage(role: 'user' | 'assistant', content: string) {
    const poster = useSession.getState();
    if (!poster.sessionId || isRunning) return;
    const index = [...poster.chat]
      .reverse()
      .findIndex((m) => m.role === role && m.content === content);
    if (index === -1) return;
    const next = poster.chat.filter(
      (_, i) => i !== poster.chat.length - 1 - index,
    );
    poster.setChat(next);
    await updateSession(poster.sessionId, { chat: next }).catch(() => {});
  }

  const runtime = useExternalStoreRuntime<ChatMessage>({
    isRunning,
    messages: chat,
    convertMessage: toThreadMessage,
    onNew: async (message: AppendMessage) => {
      const text =
        message.content[0]?.type === 'text' ? message.content[0].text : '';
      if (!text.trim()) return;
      await generate(text, 'ask');
    },
  });

  return { runtime, regenerate, deleteMessage, isRunning };
}