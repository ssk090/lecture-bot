import { X } from 'lucide-react';
import { useSession } from '../store';

export function ErrorBanner() {
  const error = useSession((s) => s.error);
  const clear = () => useSession.getState().setError('');
  if (!error) return null;
  return (
    <div className="error" role="alert">
      <X size={15} /> {error}
    </div>
  );
}