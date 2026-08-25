import { useSession } from '../store';
import { GenerationLoader } from './GenerationLoader';
import { Panel } from './Panel';
import { StreamingText } from './StreamingText';

export function TranscriptWorkspace({
  recording,
  tick,
  wordCount,
}: {
  recording: boolean;
  tick: number;
  wordCount: number;
}) {
  const liveTranscript = useSession((s) => s.liveTranscript);
  const transcript = useSession((s) => s.transcript);
  const setTranscript = useSession((s) => s.setTranscript);

  return (
    <div className="transcript-grid">
      <Panel label="live transcript" hint="browser captions">
        <div className="panel-content live-content" aria-live="polite">
          {recording ? (
            <>
              <div className="py-2">
                <GenerationLoader label="Listening…" tick={tick} variant="squares" horizontal />
              </div>
              {liveTranscript ? (
                <StreamingText
                  segments={[{ text: liveTranscript }]}
                  count={wordCount}
                  streaming
                  className="max-w-none min-h-0"
                />
              ) : (
                <p>Waiting for speech to be detected…</p>
              )}
            </>
          ) : liveTranscript ? (
            <>
              <StreamingText
                segments={[{ text: liveTranscript }]}
                count={wordCount}
                streaming={false}
                className="max-w-none min-h-0"
              />
              <p className="live-note">Captured by browser captions. Finish it in the final transcript below.</p>
            </>
          ) : (
            <p>
              Press <span className="mono-inline">start mic</span> to see live captions while you record, or upload an
              audio/video file or transcript instead.
            </p>
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
  );
}