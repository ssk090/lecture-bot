import { Loader2 } from 'lucide-react';

export function StatusLine({ busy, recording, status }: { busy: boolean; recording: boolean; status: string }) {
  return (
    <div className="status-line" aria-live="polite">
      <span className={`status-icon ${busy ? 'spinning' : ''}`}>
        {busy ? <Loader2 size={15} /> : <span className="ready-mark">✓</span>}
      </span>
      <span>
        {busy || recording ? (
          status
        ) : (
          <span className="shimmer shimmer-repeat-delay-1500">{status}</span>
        )}
      </span>
      {busy && <span className="cursor" />}
    </div>
  );
}