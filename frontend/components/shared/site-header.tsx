'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, LayoutDashboard, LogOut, Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

const links = [
  { href: '/#services', label: 'Services' },
  { href: '/#doctors', label: 'Doctors' },
  { href: '/#booking', label: 'How booking works' },
  { href: '/#contact', label: 'Contact' }
];

export function SiteHeader() {
  const router = useRouter();
  const { me, logout } = useAuth();
  const openPortal = () => router.push(me ? `/dashboard/${me.user.role}` : '/login');

  return (
    <header className='sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur'>
      <div className='container-max flex h-[72px] items-center justify-between gap-4'>
        <Link href='/' className='flex items-center gap-3 focus-ring'>
          <span className='grid size-9 place-items-center rounded-full border border-foreground font-display text-sm'>A</span>
          <span>
            <span className='block font-display text-base leading-none'>Aether Clinic</span>
            <span className='mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground'>San Francisco</span>
          </span>
        </Link>

        <nav className='hidden items-center gap-6 lg:flex' aria-label='Primary navigation'>
          {links.map((link) => <Link key={link.href} href={link.href} className='text-sm font-semibold text-muted-foreground hover:text-foreground focus-ring'>{link.label}</Link>)}
        </nav>

        <div className='hidden items-center gap-2 sm:flex'>
          <Button variant='ghost' size='sm' onClick={openPortal}>
            {me ? <LayoutDashboard className='size-4' /> : null}{me ? 'Portal' : 'Sign in'}
          </Button>
          {me ? (
            <Button variant='ghost' size='icon' onClick={() => void logout()} aria-label='Sign out'><LogOut className='size-4' /></Button>
          ) : null}
          <Link href='/book'><Button size='sm'>Book a visit <ArrowRight className='size-4' /></Button></Link>
        </div>

        <details className='group relative sm:hidden'>
          <summary className='grid size-10 cursor-pointer list-none place-items-center rounded-md border border-border' aria-label='Open navigation'>
            <Menu className='size-5' />
          </summary>
          <nav className='absolute right-0 top-12 w-64 rounded-lg border border-border bg-card p-3' aria-label='Mobile navigation'>
            {links.map((link) => <Link key={link.href} href={link.href} className='block rounded-md px-3 py-3 text-sm font-semibold hover:bg-muted'>{link.label}</Link>)}
            <div className='mt-2 border-t border-border pt-2'>
              <button className='w-full rounded-md px-3 py-3 text-left text-sm font-semibold hover:bg-muted' onClick={openPortal}>{me ? 'Open portal' : 'Sign in'}</button>
              <Link href='/book' className='block rounded-md bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground'>Book a visit</Link>
            </div>
          </nav>
        </details>
      </div>
    </header>
  );
}
