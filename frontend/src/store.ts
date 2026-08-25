import { create } from 'zustand';
import type { ChatMessage } from './api';

type SessionState = {
  transcript: string;
  liveTranscript: string;
  notes: string;
  chat: ChatMessage[];
  error: string;
  sessionId: string | null;
  appendTranscript: (text: string) => void;
  setTranscript: (text: string) => void;
  setLiveTranscript: (text: string) => void;
  setNotes: (text: string) => void;
  appendNotes: (text: string) => void;
  setChat: (chat: ChatMessage[]) => void;
  setError: (text: string) => void;
  setSessionId: (id: string | null) => void;
};

export const useSession = create<SessionState>((set) => ({
  transcript: '',
  liveTranscript: '',
  notes: '',
  chat: [],
  error: '',
  sessionId: null,
  appendTranscript: (text) => set((s) => ({ transcript: [s.transcript, text].filter(Boolean).join('\n') })),
  setTranscript: (transcript) => set({ transcript }),
  setLiveTranscript: (liveTranscript) => set({ liveTranscript }),
  setNotes: (notes) => set({ notes }),
  appendNotes: (text) => set((s) => ({ notes: [s.notes, text].filter(Boolean).join('\n\n') })),
  setChat: (chat) => set({ chat }),
  setError: (error) => set({ error }),
  setSessionId: (sessionId) => set({ sessionId })
}));
