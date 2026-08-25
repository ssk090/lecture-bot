import { useQuery } from '@tanstack/react-query';
import { createSession, deleteSession, generateSessionTitle, listSessions, saveSession, updateSession, type Session } from '../api';
import { useSession } from '../store';

export function useSessionThreads(setTab: (tab: 'write' | 'preview') => void, setBusy: (text: string) => void) {
  const { sessionId, transcript, notes, setSessionId, setTranscript, setLiveTranscript, setNotes, setError } = useSession();
  const sessions = useQuery({ queryKey: ['sessions'], queryFn: listSessions });

  function clearSession() {
    setSessionId(null);
    setTranscript('');
    setLiveTranscript('');
    setNotes('');
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
    setBusy('Saving session…');
    try {
      setError('');
      const title = await generateSessionTitle([transcript, notes].filter(Boolean).join('\n\n'));
      const result = await saveSession(sessionId, transcript, notes, title);
      setSessionId(result.id);
      await updateSession(result.id, { title });
      await sessions.refetch();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Save failed. Is MongoDB running?');
    } finally {
      setBusy('');
    }
  }

  return { sessions, newSession, openSession, removeSession, saveCurrent };
}
