import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateSessionTitle, transcribeAudio, updateSession } from './api';
import { useSession } from './store';

/** Best-effort: name the current session from its transcript/notes. */
export function useAutoTitle() {
  const queryClient = useQueryClient();
  return async function autoTitle() {
    const { sessionId, transcript, notes } = useSession.getState();
    const text = [transcript, notes].filter(Boolean).join('\n\n').trim();
    if (!text || !sessionId) return;
    try {
      const title = await generateSessionTitle(text.slice(0, 4000));
      await updateSession(sessionId, { title });
    } catch {
      // naming is cosmetic; never surface an error for it
    }
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
  };
}

export function useTranscribe() {
  const { appendTranscript, setError } = useSession();
  const autoTitle = useAutoTitle();
  return useMutation({
    mutationFn: ({ blob, name }: { blob: Blob; name: string }) => transcribeAudio(blob, name),
    onSuccess: (transcript) => {
      setError('');
      appendTranscript(transcript);
      void autoTitle();
    },
    onError: (error) => setError(`${error instanceof Error ? error.message : 'Transcription failed'}. Check Parakeet and try again.`)
  });
}