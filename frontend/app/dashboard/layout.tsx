'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarCheck, Home, LayoutDashboard, LogOut, Stethoscope, UsersRound } from 'lucide-react';

import { Protected } from '@/components/shared/protected';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { roleLabels } from '@/lib/uk';

const linksByRole = {
  admin: [
    { href: '/dashboard/admin', label: 'Огляд', icon: LayoutDashboard },
    { href: '/dashboard/admin#appointments', label: 'Записи', icon: CalendarCheck },
    { href: '/dashboard/admin#operations', label: 'Операції', icon: UsersRound }
  ],
  doctor: [{ href: '/dashboard/doctor', label: 'Розклад', icon: Stethoscope }],
  patient: [{ href: '/dashboard/patient', label: 'Мої записи', icon: CalendarCheck }]
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { me, logout } = useAuth();

  return (
    <Protected>
      <div className='min-h-screen'>
        <div className='workspace-max py-4 sm:py-6'>
          <div className='grid gap-5 lg:grid-cols-[270px,minmax(0,1fr)]'>
            <aside className='ink-panel h-fit min-w-0 p-4 lg:sticky lg:top-5'>
              <div className='flex items-center justify-between gap-4 border-b border-white/10 pb-5'>
                <Link href='/' className='flex items-center gap-3'>
                  <span className='grid size-10 place-items-center rounded-md bg-white text-sm font-semibold text-ink'>AC</span>
                  <span>
                    <span className='block font-display text-sm font-semibold tracking-tight'>Aether Clinic</span>
                    <span className='text-[11px] uppercase tracking-[0.14em] text-white/45'>Кабінет</span>
                  </span>
                </Link>
                <Link href='/' aria-label='Повернутися на сайт'>
                  <Button variant='ghost' size='icon' className='text-white/70 hover:bg-white/10 hover:text-white'>
                    <Home className='size-4' />
                  </Button>
                </Link>
              </div>

              <nav className='no-scrollbar mt-5 flex min-w-0 gap-2 overflow-x-auto lg:block lg:space-y-1'>
                {me &&
                  linksByRole[me.user.role].map((item, index) => {
                    const baseHref = item.href.split('#')[0];
                    const isHashLink = item.href.includes('#');
                    const isActive = !isHashLink && (pathname === baseHref || pathname.startsWith(`${baseHref}/`));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={`${item.label}-${index}`}
                        href={item.href}
                        className={cn(
                          'flex shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition lg:w-full',
                          isActive
                            ? 'bg-white text-ink'
                            : 'text-white/62 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        <Icon className='size-4' />
                        {item.label}
                      </Link>
                    );
                  })}
              </nav>

              <div className='mt-6 border-t border-white/10 pt-5'>
                <p className='text-xs uppercase tracking-[0.14em] text-white/40'>Ви увійшли як</p>
                <p className='mt-2 truncate text-sm font-semibold'>{me?.user.full_name}</p>
                <div className='mt-3 flex items-center justify-between gap-3'>
                  <Badge className='border-white/15 bg-white/10 text-white'>{me ? roleLabels[me.user.role] : '-'}</Badge>
                  <Button variant='ghost' size='icon' className='text-white/70 hover:bg-white/10 hover:text-white' onClick={logout} aria-label='Вийти'>
                    <LogOut className='size-4' />
                  </Button>
                </div>
              </div>
            </aside>

            <main className='min-w-0 space-y-6'>
              <div className='flex flex-col gap-4 border-b border-border/75 pb-5 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <p className='kicker'>Робочий кабінет</p>
                  <p className='mt-1 text-sm leading-6 text-muted-foreground'>Записи, розклад, пацієнти і дії команди клініки.</p>
                </div>
                <Button variant='outline' size='sm' onClick={logout}>
                  <LogOut className='size-4' />
                  Вийти
                </Button>
              </div>
              {children}
            </main>
          </div>
        </div>
      </div>
    </Protected>
  );
}
