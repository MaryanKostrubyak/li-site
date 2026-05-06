'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth-context';
import { UserRole } from '@/types/api';

export function Protected({
  children,
  role
}: {
  children: React.ReactNode;
  role?: UserRole;
}) {
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

    if (role && me.user.role !== role) {
      router.replace(`/dashboard/${me.user.role}`);
    }
  }, [loading, me, role, router]);

  if (loading || !me || (role && me.user.role !== role)) {
    return (
      <div className='workspace-max page-y'>
        <div className='dashboard-panel px-5 py-6 text-sm text-muted-foreground'>Завантажуємо захищений кабінет...</div>
      </div>
    );
  }

  return <>{children}</>;
}
