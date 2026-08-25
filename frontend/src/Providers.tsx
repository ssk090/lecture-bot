import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRef } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const client = useRef(new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));
  return <QueryClientProvider client={client.current}>{children}</QueryClientProvider>;
}
