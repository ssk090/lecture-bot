import { useQuery } from '@tanstack/react-query';
import { createSession, deleteSession, generateSessionTitle, getSession, listSessions, saveSession, updateSession, type Session } from '../api';
import { isCurrentSession, useSession } from '../store';

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


  /** Persist the current session's unsaved transcript/notes before leaving it. */
  async function flushCurrent() {
    const current = useSession.getState();
    if (!current.sessionId) return;
    const { transcript, notes } = current;
    if (!transcript.trim() && !notes.trim()) return;
    await updateSession(current.sessionId, { transcript, notes }).catch(() => {});
  }

  async function newSession() {
    setBusy('Creating session…');
    try {
      await flushCurrent();
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

  async function openSession(session: Session) {
    await flushCurrent(); // keep this session's edits before switching
    // load fresh data so the just-flushed transcript/notes are reflected
    const latest = await getSession(session.id).catch(() => session);
    setSessionId(latest.id);
    setTranscript(latest.transcript);
    setLiveTranscript('');
    setNotes(latest.notes);
    setError('');
    setTab('write');
    await sessions.refetch();
  }

  async function removeSession(id: string) {
    await deleteSession(id);
    if (sessionId === id) clearSession();
    await sessions.refetch();
  }

  async function saveCurrent() {
    if (!notes.trim() && !transcript.trim()) return;
    const targetId = sessionId; // anchor to the active session
    setBusy('Saving session…');
    try {
      setError('');
      const title = await generateSessionTitle([transcript, notes].filter(Boolean).join('\n\n'));
      const result = await saveSession(targetId, transcript, notes, title);
      await updateSession(result.id, { title });
      // only claim the new id if the user is still on this thread
      if (isCurrentSession(targetId)) setSessionId(result.id);
      await sessions.refetch();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Save failed. Is MongoDB running?');
    } finally {
      setBusy('');
    }
  }

  return { sessions, newSession, openSession, removeSession, saveCurrent };
}
