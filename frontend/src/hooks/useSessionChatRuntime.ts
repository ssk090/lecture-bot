import { useState } from 'react';
import {
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from '@assistant-ui/react';
import { askSession, type ChatMessage } from '../api';
import { useSession } from '../store';

function toThreadMessage(message: ChatMessage): ThreadMessageLike {
  return { role: message.role, content: [{ type: 'text', text: message.content }] };
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useSessionChatRuntime() {
  const chat = useSession((s) => s.chat);
  const sessionId = useSession((s) => s.sessionId);
  const setError = useSession((s) => s.setError);
  const [isRunning, setIsRunning] = useState(false);

  const runtime = useExternalStoreRuntime<ChatMessage>({
    isRunning,
    messages: chat,
    convertMessage: toThreadMessage,
    onNew: async (message: AppendMessage) => {
      const poster = useSession.getState();
      const id = poster.sessionId;
      const text =
        message.content[0]?.type === 'text' ? message.content[0].text : '';
      if (!text.trim() || !id) return;

      poster.setChat([...poster.chat, { role: 'user', content: text }]);
      setIsRunning(true);
      setError('');
      try {
        const result = await askSession(id, text);
        const answer =
          [...result.chat].reverse().find((m) => m.role === 'assistant')
            ?.content ?? '';

        // stream the answer into the bubble by revealing it word by word
        const before = [...poster.chat, { role: 'assistant' as const, content: '' }];
        const words = answer.split(' ');
        const stepWords = Math.max(1, Math.ceil(words.length / 60));
        for (let i = stepWords; i <= words.length; i += stepWords) {
          poster.setChat([
            ...before.slice(0, -1),
            { role: 'assistant', content: words.slice(0, i).join(' ') },
          ]);
          await delay(16);
        }
        poster.setChat(result.chat);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : 'Chat failed. Is MongoDB running?',
        );
      } finally {
        setIsRunning(false);
      }
    },
  });

  return runtime;
}