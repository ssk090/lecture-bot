import { useQuery } from '@tanstack/react-query';
import { createSession, deleteSession, generateSessionTitle, listSessions, saveSession, updateSession, type Session } from '../api';
import { useSession } from '../store';

export function useSessionThreads(setTab: (tab: 'write' | 'preview') => void, setBusy: (text: string) => void) {
  const { sessionId, transcript, notes, setSessionId, setTranscript, setLiveTranscript, setNotes, setChat, setError } = useSession();
  const sessions = useQuery({ queryKey: ['sessions'], queryFn: listSessions });

  function clearSession() {
    setSessionId(null);
    setTranscript('');
    setLiveTranscript('');
    setNotes('');
    setChat([]);
    setError('');
    setTab('write');
  }


  async function newSession() {
    setBusy('Creating session…');
    try {
      const id = await createSession('', '', 'New session');
      clearSession();
      setSessionId(id);
      await sessions.refetch();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Create session failed');
    } finally {
      setBusy('');
    }
  }

  function openSession(session: Session) {
    setSessionId(session.id);
    setTranscript(session.transcript);
    setLiveTranscript('');
    setNotes(session.notes);
    setChat(session.chat ?? []);
    setError('');
    setTab('write');
  }

  async function removeSession(id: string) {
    await deleteSession(id);
    if (sessionId === id) clearSession();
    await sessions.refetch();
  }

  async function saveCurrent() {
    if (!notes.trim() && !transcript.trim()) return;
    const targetId = useSession.getState().sessionId; // anchor to the active session
    setBusy('Saving session…');
    try {
      setError('');
      const title = await generateSessionTitle([transcript, notes].filter(Boolean).join('\n\n'));
      const result = await saveSession(targetId, transcript, notes, title);
      await updateSession(result.id, { title });
      // only claim the new id if the user is still on this thread
      if (useSession.getState().sessionId === targetId) setSessionId(result.id);
      await sessions.refetch();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Save failed. Is MongoDB running?');
    } finally {
      setBusy('');
    }
  }

  return { sessions, newSession, openSession, removeSession, saveCurrent };
}
