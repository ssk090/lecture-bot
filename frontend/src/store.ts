import { create } from 'zustand';

// Single client-side record for the active session. Every async path that
// writes here anchors to the session id it started with and abandons the
// write if the user switches threads mid-flight. Use `isCurrentSession` for
// that anchor check instead of reaching into the store directly.

type SessionState = {
  transcript: string;
  liveTranscript: string;
  notes: string;
  error: string;
  sessionId: string | null;
  appendTranscript: (text: string) => void;
  setTranscript: (text: string) => void;
  setLiveTranscript: (text: string) => void;
  setNotes: (text: string) => void;
  appendNotes: (text: string) => void;
  setError: (text: string) => void;
  setSessionId: (id: string | null) => void;
};

export const useSession = create<SessionState>((set) => ({
  transcript: '',
  liveTranscript: '',
  notes: '',
  error: '',
  sessionId: null,
  appendTranscript: (text) => set((s) => ({ transcript: [s.transcript, text].filter(Boolean).join('\n') })),
  setTranscript: (transcript) => set({ transcript }),
  setLiveTranscript: (liveTranscript) => set({ liveTranscript }),
  setNotes: (notes) => set({ notes }),
  appendNotes: (text) => set((s) => ({ notes: [s.notes, text].filter(Boolean).join('\n\n') })),
  setError: (error) => set({ error }),
  setSessionId: (sessionId) => set({ sessionId })
}));

/** True when `id` is the still-active workspace session (race-guard anchor). */
export function isCurrentSession(id: string | null | undefined): boolean {
  return useSession.getState().sessionId === id;
}
