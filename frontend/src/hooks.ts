import { useMutation } from '@tanstack/react-query';
import { generateStudyPack, transcribeAudio } from './api';
import { useSession } from './store';

export function useTranscribe() {
  const { appendTranscript, setError } = useSession();
  return useMutation({
    mutationFn: ({ blob, name }: { blob: Blob; name: string }) => transcribeAudio(blob, name),
    onSuccess: (transcript) => {
      setError('');
      appendTranscript(transcript);
    },
    onError: (error) => setError(`${error instanceof Error ? error.message : 'Transcription failed'}. Check Parakeet and try again.`)
  });
}

export function useStudyPack() {
  const { setNotes, setError } = useSession();
  return useMutation({
    mutationFn: (transcript: string) => generateStudyPack(transcript),
    onSuccess: (notes) => {
      setError('');
      setNotes(notes);
    },
    onError: (error) => setError(`${error instanceof Error ? error.message : 'Study pack failed'}. Check OpenCode and try again.`)
  });
}
