import { useRef } from 'react';
import { FileText, Mic, Save, Square, Upload, WandSparkles } from 'lucide-react';

export function Toolbar({
  recording,
  busy,
  canMake,
  canSave,
  onUploadAudio,
  onUploadTranscript,
  onToggleMic,
  onMakePack,
  onSave,
}: {
  recording: boolean;
  busy: boolean;
  canMake: boolean;
  canSave: boolean;
  onUploadAudio: (file: File | undefined) => void;
  onUploadTranscript: (file: File | undefined) => void;
  onToggleMic: () => void;
  onMakePack: () => void;
  onSave: () => void;
}) {
  const audioRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={audioRef}
        className="sr-only"
        type="file"
        accept="audio/*,video/*"
        onChange={(e) => onUploadAudio(e.target.files?.[0])}
      />
      <input
        ref={textRef}
        className="sr-only"
        type="file"
        accept=".txt,.md,.srt,.vtt,text/plain"
        onChange={(e) => onUploadTranscript(e.target.files?.[0])}
      />
      <div className="toolbar">
        <button className="cli-button" onClick={() => audioRef.current?.click()}>
          <Upload size={15} /> upload audio/video
        </button>
        <button className="cli-button" onClick={() => textRef.current?.click()}>
          <FileText size={15} /> upload transcript
        </button>
        <span className="toolbar-divider" />
        <button className={`cli-button ${recording ? 'recording' : ''}`} onClick={onToggleMic}>
          {recording ? <Square size={13} /> : <Mic size={15} />} {recording ? 'stop & transcribe' : 'start mic'}
        </button>
        <button className="cli-button primary" onClick={onMakePack} disabled={busy || !canMake}>
          <WandSparkles size={15} /> make study pack
        </button>
        <button className="cli-button" onClick={onSave} disabled={busy || !canSave}>
          <Save size={15} /> save session
        </button>
      </div>
    </>
  );
}