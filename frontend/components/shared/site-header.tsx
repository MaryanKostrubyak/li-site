'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, LayoutDashboard, LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

const publicLinks = [
  { href: '/', label: 'Головна' },
  { href: '/#how', label: 'Як це працює' },
  { href: '/#services', label: 'Послуги' },
  { href: '/#doctors', label: 'Лікарі' },
  { href: '/#contact', label: 'Контакти' }
];

export function SiteHeader() {
  const router = useRouter();
  const { me, logout } = useAuth();

  const goDashboard = () => {
    if (!me) {
      router.push('/login');
      return;
    }
    router.push(`/dashboard/${me.user.role}`);
  };

  return (
    <header className='sticky top-0 z-40 border-b border-border/75 bg-background/90 backdrop-blur-xl'>
      <div className='container-max flex min-h-16 items-center justify-between gap-4 py-3'>
        <div className='flex min-w-0 items-center gap-8'>
          <Link href='/' className='group flex items-center gap-3'>
            <span className='grid size-9 shrink-0 place-items-center rounded-md bg-ink text-sm font-semibold text-white transition group-hover:bg-primary'>
              AC
            </span>
            <span className='min-w-0'>
              <span className='block font-display text-sm font-semibold leading-4 tracking-tight'>Aether Clinic</span>
              <span className='hidden text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:block'>
                Запис + кабінет
              </span>
            </span>
          </Link>
          <nav className='hidden items-center gap-1 lg:flex'>
            {publicLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className='rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted/70 hover:text-foreground'
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className='flex items-center gap-2'>
          {me ? (
            <>
              <Button variant='outline' size='sm' onClick={goDashboard} aria-label='Відкрити кабінет'>
                <LayoutDashboard className='size-4' />
                <span className='hidden sm:inline'>Кабінет</span>
              </Button>
              <Button variant='ghost' size='icon' onClick={logout} aria-label='Вийти'>
                <LogOut className='size-4' />
              </Button>
            </>
          ) : (
            <>
              <Link href='/login'>
                <Button variant='ghost' size='sm'>
                  Увійти
                </Button>
              </Link>
              <Link href='/book'>
                <Button size='sm'>
                  Запис
                  <ArrowRight className='size-4' />
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
      <nav className='container-max no-scrollbar flex gap-1 overflow-x-auto pb-3 lg:hidden'>
        {publicLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className='shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted/70 hover:text-foreground'
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
