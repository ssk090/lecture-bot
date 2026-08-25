import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronRight, Download, FileText, Loader2, Mic, Save, Square, Upload, WandSparkles, X } from 'lucide-react';
import { marked } from 'marked';
import { useSession } from './store';
import { chunkTranscript } from './chunk';
import { useStudyPack, useTranscribe } from './hooks';
import { listSessions, saveSession, type Session } from './api';
import { GenerationLoader } from './components/GenerationLoader';
import { StreamingText } from './components/StreamingText';

const steps = ['Listen', 'Transcribe', 'Synthesize', 'Review'];

function FlowRail({ active }: { active: number }) {
  return (
    <aside className="rail">
      <div className="rail-title">/ flow</div>
      {steps.map((step, i) => (
        <div className={`flow-step ${i <= active ? 'is-active' : ''}`} key={step}>
          <span className="flow-dot">{i < active ? <Check size={12} /> : String(i + 1).padStart(2, '0')}</span>
          <span>{step}</span>
          {i < steps.length - 1 && <ChevronRight size={13} className="flow-arrow" />}
        </div>
      ))}
    </aside>
  );
}

function Panel({ label, hint, className = '', children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-bar">
        <span>{label}</span>
        {hint && <span className="panel-hint">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

export function App() {
  const {
    transcript,
    liveTranscript,
    notes,
    error,
    sessionId,
    setTranscript,
    setLiveTranscript,
    setNotes,
    appendNotes,
    appendTranscript,
    setError,
    setSessionId
  } = useSession();
  const transcribe = useTranscribe();
  const study = useStudyPack();
  const [recording, setRecording] = useState(false);
  const [tick, setTick] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const audioInput = useRef<HTMLInputElement>(null);
  const transcriptInput = useRef<HTMLInputElement>(null);
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
    setError('');
    setTab('write');
    setNotes('');
    try {
      for (let i = 0; i < parts.length; i++) {
        setBusy(`Generating study pack, part ${i + 1} of ${parts.length}…`);
        const notes = await study.mutateAsync(parts[i]);
        appendNotes(`## Part ${i + 1}\n\n${notes}`);
      }
    } finally {
      setBusy('');
    }
  }

  function download() {
    if (!notes) return;
    const url = URL.createObjectURL(new Blob([notes], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'study-pack.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  const sessions = useQuery({ queryKey: ['sessions'], queryFn: listSessions });

  async function save() {
    if (!notes.trim() || !transcript.trim()) return;
    setBusy('Saving session…');
    try {
      setError('');
      const result = await saveSession(sessionId, transcript, notes);
      setSessionId(result.id);
      await sessions.refetch();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Save failed. Is MongoDB running?');
    } finally {
      setBusy('');
    }
  }

  function openSession(session: Session) {
    setSessionId(session.id);
    setTranscript(session.transcript);
    setNotes(session.notes);
    setError('');
  }

  const status = busy || (recording ? 'Listening for audio input…' : 'Ready. Add a lecture to begin.');

  return (
    <main className="app-shell">
      <input ref={audioInput} className="sr-only" type="file" accept="audio/*,video/*" onChange={(e) => uploadAudio(e.target.files?.[0])} />
      <input
        ref={transcriptInput}
        className="sr-only"
        type="file"
        accept=".txt,.md,.srt,.vtt,text/plain"
        onChange={(e) => uploadTranscript(e.target.files?.[0])}
      />
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">&gt;_</span>
          <span>lecture.bot</span>
          <span className="version">v0.4.2</span>
        </div>
        <div className="top-meta">
          <span className="status-dot" /> local session <span className="slash">/</span> no data leaves your browser
        </div>
      </header>
      <div className="workspace">
        <FlowRail active={notes ? 3 : transcript ? 2 : recording ? 1 : 0} />
        <div className="content">
          <div className="intro">
            <div>
              <p className="eyebrow">/ workspace / lecture</p>
              <h1>
                Turn lectures into
                <br />
                <span>something you can use.</span>
              </h1>
            </div>
            <p className="intro-copy">
              Record or upload a lecture.
              <br />
              Get a study pack back.
            </p>
          </div>

          <div className="toolbar">
            <button className="cli-button" onClick={() => audioInput.current?.click()}>
              <Upload size={15} /> upload audio/video
            </button>
            <button className="cli-button" onClick={() => transcriptInput.current?.click()}>
              <FileText size={15} /> upload transcript
            </button>
            <span className="toolbar-divider" />
            <button className={`cli-button ${recording ? 'recording' : ''}`} onClick={recording ? stop : start}>
              {recording ? <Square size={13} /> : <Mic size={15} />} {recording ? 'stop & transcribe' : 'start mic'}
            </button>
            <button className="cli-button primary" onClick={runStudy} disabled={Boolean(busy) || !transcript.trim()}>
              <WandSparkles size={15} /> make study pack
            </button>
            <button className="cli-button" onClick={save} disabled={!notes || !transcript.trim() || Boolean(busy)}>
              <Save size={15} /> save session
            </button>
          </div>

          {error && (
            <div className="error" role="alert">
              <X size={15} /> {error}
            </div>
          )}

          <div className="status-line" aria-live="polite">
            <span className={`status-icon ${busy ? 'spinning' : ''}`}>
              {busy ? <Loader2 size={15} /> : <span className="ready-mark">✓</span>}
            </span>
            <span>{busy ? status : recording ? status : <span className="shimmer shimmer-repeat-delay-1500">{status}</span>}</span>
            {busy && <span className="cursor" />}
          </div>

          <div className="transcript-grid">
            <Panel label="live transcript" hint="browser captions">
              <div className="panel-content live-content" aria-live="polite">
                <div className="py-2">
                  <GenerationLoader label="Listening..." tick={tick} variant="squares" horizontal />
                </div>
                {liveTranscript ? (
                  <StreamingText
                    segments={[{ text: liveTranscript }]}
                    count={wordCount}
                    streaming={recording}
                    className="max-w-none min-h-0"
                  />
                ) : (
                  <p>{'Live transcript will appear here while you record.'}</p>
                )}
              </div>
            </Panel>
            <Panel label="final transcript" hint="editable">
              <textarea
                aria-label="Final transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste a transcript or record a lecture…"
              />
            </Panel>
          </div>

          <Panel
            label="study pack"
            hint={sessionId ? `session ${sessionId.slice(-6)} saved` : 'generated markdown'}
            className="study-panel"
          >
            <div className="tabs">
              <button className={tab === 'write' ? 'tab-active' : ''} onClick={() => setTab('write')}>
                Write
              </button>
              <button className={tab === 'preview' ? 'tab-active' : ''} onClick={() => setTab('preview')}>
                Preview
              </button>
              <span className="tab-file">
                <FileText size={13} /> study-pack.md
              </span>
              <button
                className="tab-action"
                onClick={download}
                disabled={!notes || Boolean(busy)}
                title="Download markdown file"
                style={{ marginLeft: 16 }}
              >
                <Download size={13} /> download .md
              </button>
            </div>
            {tab === 'write' ? (
              <textarea
                className="markdown-editor"
                aria-label="Markdown study pack"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Your generated study pack will appear here."
              />
            ) : notes ? (
              <article className="markdown-preview" dangerouslySetInnerHTML={{ __html: marked(notes) }} />
            ) : (
              <div className="markdown-preview">Nothing to preview yet.</div>
            )}
          </Panel>

          <footer>
            <span>lecture.bot is a local-first tool for focused learning.</span>
            <span>parakeet stt / opencode llm</span>
          </footer>
        </div>
      </div>
    </main>
  );
}
