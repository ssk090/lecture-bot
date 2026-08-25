import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useSession } from './store';
import { chunkTranscript } from './chunk';
import { useAutoTitle, useStudyPack, useTranscribe } from './hooks';
import { useSessionThreads } from './hooks/useSessionThreads';
import { AppHeader } from './components/AppHeader';
import { ErrorBanner } from './components/ErrorBanner';
import { Hero } from './components/Hero';
import { StatusLine } from './components/StatusLine';
import { StudyPack } from './components/StudyPack';
import { ThreadSidebar } from './components/ThreadSidebar';
import { Toolbar } from './components/Toolbar';
import { TranscriptWorkspace } from './components/TranscriptWorkspace';
import { WorkspaceFooter } from './components/WorkspaceFooter';

// assistant-ui (and its ~230 kB) loads only when the chat drawer opens
const ChatDrawer = lazy(() => import('./components/assistant-ui/ChatDrawer'));

export function App() {
  const {
    transcript,
    notes,
    sessionId,
    liveTranscript,
    setTranscript,
    setNotes,
    setLiveTranscript,
    appendNotes,
    appendTranscript,
    setError,
  } = useSession();
  const transcribe = useTranscribe();
  const autoTitle = useAutoTitle();
  const study = useStudyPack();
  const [recording, setRecording] = useState(false);
  const [tick, setTick] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const recorder = useRef<MediaRecorder | null>(null);
  const recognition = useRef<any>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, [recording]);

  // stream the visible live-transcript word count while recording
  useEffect(() => {
    if (!recording) {
      setWordCount(liveTranscript.split(' ').filter(Boolean).length);
      return;
    }
    const id = setInterval(() => {
      setWordCount((c) => {
        const target = liveTranscript.split(' ').filter(Boolean).length;
        return c < target ? Math.min(c + 2, target) : target;
      });
    }, 120);
    return () => clearInterval(id);
  }, [recording, liveTranscript]);

  async function uploadAudio(file?: File) {
    if (!file) return;
    setError('');
    setBusy('Transcribing audio…');
    transcribe.mutate({ blob: file, name: file.name }, { onSettled: () => setBusy('') });
  }

  async function uploadTranscript(file?: File) {
    if (!file) return;
    setError('');
    setTranscript(await file.text());
    void autoTitle();
  }

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks.current = [];
    setError('');
    setLiveTranscript('');
    setRecording(true);
    setTick(0);
    recorder.current = new MediaRecorder(stream);
    recorder.current.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    recorder.current.onstop = () => {
      setRecording(false);
      setBusy('Transcribing recording…');
      transcribe.mutate({ blob: new Blob(chunks.current, { type: 'audio/webm' }), name: 'audio.webm' }, { onSettled: () => setBusy('') });
    };
    recorder.current.start();

    const SpeechRecognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    recognition.current = new SpeechRecognition();
    recognition.current.continuous = true;
    recognition.current.interimResults = true;
    recognition.current.onresult = (event: any) => {
      setLiveTranscript(
        Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join(' ')
      );
    };
    recognition.current.start();
  }

  function stop() {
    recognition.current?.stop();
    recorder.current?.stop();
    recorder.current?.stream.getTracks().forEach((t) => t.stop());
  }

  async function runStudy() {
    const parts = chunkTranscript(transcript);
    if (!parts.length) return;
    const targetId = sessionId; // anchor to the active session
    setError('');
    setTab('write');
    setNotes('');
    try {
      for (let i = 0; i < parts.length; i++) {
        if (useSession.getState().sessionId !== targetId) break; // user switched threads
        setBusy(`Generating study pack, part ${i + 1} of ${parts.length}…`);
        const generated = await study.mutateAsync(parts[i]);
        if (useSession.getState().sessionId !== targetId) break;
        appendNotes(`## Part ${i + 1}\n\n${generated}`);
      }
    } finally {
      setBusy('');
    }
  }

  const { sessions, newSession, openSession, removeSession, saveCurrent } = useSessionThreads(setTab, setBusy);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const drawerSession = drawerId ? sessions.data?.find((s) => s.id === drawerId) : undefined;

  const status = busy || (recording ? 'Listening for audio input…' : 'Ready. Add a lecture to begin.');

  return (
    <main className="app-shell">
      <AppHeader />
      <div className="workspace">
        <ThreadSidebar
          sessions={sessions.data ?? []}
          activeId={sessionId}
          onNew={newSession}
          onOpen={openSession}
          onAsk={(session) => setDrawerId(session.id)}
          onDelete={removeSession}
        />
        <div className="content">
          <Hero />
          <Toolbar
            recording={recording}
            busy={Boolean(busy)}
            canMake={!!transcript.trim()}
            canSave={!(notes.trim() === '' && transcript.trim() === '')}
            onUploadAudio={uploadAudio}
            onUploadTranscript={uploadTranscript}
            onToggleMic={recording ? stop : start}
            onMakePack={runStudy}
            onSave={saveCurrent}
          />
          <ErrorBanner />
          <StatusLine busy={Boolean(busy)} recording={recording} status={status} />
          <TranscriptWorkspace recording={recording} tick={tick} wordCount={wordCount} />
          <StudyPack busy={Boolean(busy)} tab={tab} onTab={setTab} />
          <WorkspaceFooter />
        </div>
      </div>
      {drawerId && (
        <Suspense fallback={null}>
          <ChatDrawer
            sessionId={drawerId}
            title={drawerSession?.title}
            onClose={() => setDrawerId(null)}
          />
        </Suspense>
      )}
    </main>
  );
}