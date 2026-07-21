'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth-context';

export default function DashboardIndexPage() {
  const router = useRouter();
  const { me, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!me) {
      router.replace('/login');
      return;
    }
    router.replace(`/dashboard/${me.user.role}`);
  }, [me, loading, router]);

  return (
    <div className='workspace-max page-y'>
      <div className='dashboard-panel px-5 py-6 text-sm text-muted-foreground'>Opening your portal…</div>
    </div>
  );
}
