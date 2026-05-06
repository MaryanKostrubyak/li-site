'use client';

import { AuthProvider } from '@/lib/auth-context';
import { ReactQueryProvider } from '@/lib/react-query-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </ReactQueryProvider>
  );
}
