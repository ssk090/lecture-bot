import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { isCurrentSession, useSession } from './store';
import { isAbortError, streamStudyPack } from './api';
import { useAutoTitle, useTranscribe } from './hooks';
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
  const { transcript, notes, sessionId, liveTranscript, setTranscript, setNotes, setLiveTranscript, appendTranscript, setError } =
    useSession();
  const transcribe = useTranscribe();
  const autoTitle = useAutoTitle();
  const [recording, setRecording] = useState(false);
  const [tick, setTick] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [busyText, setBusyText] = useState('');
  const isBusy = busyText !== '';
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
    setBusyText('Transcribing audio…');
    transcribe.mutate({ blob: file, name: file.name }, { onSettled: () => setBusyText('') });
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
      setBusyText('Transcribing recording…');
      transcribe.mutate(
        { blob: new Blob(chunks.current, { type: 'audio/webm' }), name: 'audio.webm' },
        { onSettled: () => setBusyText('') }
      );
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
    if (!transcript.trim()) return;
    let anchor = sessionId; // follows the active session; adopts the id autosave lazily creates
    setError('');
    setNotes('');
    setBusyText('Generating study pack…');
    let accumulated = '';
    const controller = new AbortController();
    const onPageHide = () => controller.abort();
    window.addEventListener('pagehide', onPageHide);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const applyIfCurrent = (text: string) => {
      if (isCurrentSession(anchor)) setNotes(text);
    };
    // checkpoint the partial pack ~1.5s after the last delta, and immediately at each merged boundary
    const flushNow = async () => {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
      if (!isCurrentSession(anchor)) return;
      const id = await autosaveCurrent({ notes: accumulated });
      if (id && isCurrentSession(id)) anchor = id; // adopt the lazily-created id
    };
    const scheduleFlush = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(flushNow, 1500);
    };
    try {
      await streamStudyPack(
        transcript,
        {
          onProgress: (index, total) => {
            if (isCurrentSession(anchor)) {
              setBusyText(total > 1 ? `Generating study pack… part ${index} of ${total}` : 'Generating study pack…');
            }
          },
          onDelta: (text) => {
            accumulated += text;
            applyIfCurrent(accumulated);
            scheduleFlush();
          },
          onMerged: (document) => {
            accumulated = document;
            applyIfCurrent(document);
            flushNow();
          }
        },
        controller.signal
      );
      applyIfCurrent(accumulated);
      flushNow();
    } catch (error) {
      if (isAbortError(error)) return; // refresh/close: nothing wrong, no banner
      if (isCurrentSession(anchor)) {
        setError(`${error instanceof Error ? error.message : 'Study pack failed'}. Check OpenCode and try again.`);
      }
    } finally {
      window.removeEventListener('pagehide', onPageHide);
      if (timer) clearTimeout(timer);
      if (isCurrentSession(anchor)) setBusyText('');
    }
  }

  const { sessions, newSession, openSession, removeSession, saveCurrent, autosaveCurrent } = useSessionThreads(setTab, setBusyText);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const drawerSession = drawerId ? sessions.data?.find((s) => s.id === drawerId) : undefined;

  const status = busyText || (recording ? 'Listening for audio input…' : 'Ready. Add a lecture to begin.');

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
            busy={isBusy}
            canMake={!!transcript.trim()}
            canSave={!(notes.trim() === '' && transcript.trim() === '')}
            onUploadAudio={uploadAudio}
            onUploadTranscript={uploadTranscript}
            onToggleMic={recording ? stop : start}
            onMakePack={runStudy}
            onSave={saveCurrent}
          />
          <ErrorBanner />
          <StatusLine busy={isBusy} recording={recording} status={status} />
          <TranscriptWorkspace recording={recording} tick={tick} wordCount={wordCount} />
          <StudyPack busy={isBusy} tab={tab} onTab={setTab} />
          <WorkspaceFooter />
        </div>
      </div>
      {drawerId && (
        <Suspense fallback={null}>
          <ChatDrawer sessionId={drawerId} title={drawerSession?.title} onClose={() => setDrawerId(null)} />
        </Suspense>
      )}
    </main>
  );
}
