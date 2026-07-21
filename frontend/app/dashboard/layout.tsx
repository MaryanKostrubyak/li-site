'use client';

import { CalendarDays, ClipboardList, History, Home, LayoutDashboard, LogOut, Menu, Settings2, Stethoscope, UserRound, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Protected } from '@/components/shared/protected';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const linksByRole = {
  admin: [
    { href: '/dashboard/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/admin/appointments', label: 'Appointments', icon: CalendarDays },
    { href: '/dashboard/admin/appointments/new', label: 'New appointment', icon: ClipboardList },
    { href: '/dashboard/admin/patients', label: 'Patients', icon: UsersRound }
  ],
  doctor: [
    { href: '/dashboard/doctor', label: 'Today', icon: Stethoscope },
    { href: '/dashboard/doctor/upcoming', label: 'Upcoming', icon: CalendarDays },
    { href: '/dashboard/doctor/schedule', label: 'Schedule', icon: ClipboardList }
  ],
  patient: [
    { href: '/dashboard/patient', label: 'Upcoming', icon: CalendarDays },
    { href: '/dashboard/patient/history', label: 'History', icon: History },
    { href: '/dashboard/patient/profile', label: 'Profile', icon: Settings2 }
  ]
};

function Navigation({ role, pathname }: { role: keyof typeof linksByRole; pathname: string }) {
  return <nav className='space-y-1' aria-label='Portal navigation'>{linksByRole[role].map((item) => { const Icon = item.icon; const active = pathname === item.href; return <Link key={item.href} href={item.href} className={cn('flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold', active ? 'bg-background text-foreground' : 'text-white/65 hover:bg-white/10 hover:text-white')}><Icon className='size-4' />{item.label}</Link>; })}</nav>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { me, logout } = useAuth();
  const role = me?.user.role;
  return (
    <Protected>
      <div className='min-h-screen lg:grid lg:grid-cols-[250px,1fr]'>
        <aside className='hidden min-h-screen bg-primary p-5 text-white lg:flex lg:flex-col'>
          <Link href='/' className='flex items-center gap-3 border-b border-white/15 pb-5'><span className='grid size-9 place-items-center rounded-full border border-white/50 font-display'>A</span><span><span className='block font-display'>Aether Clinic</span><span className='text-[9px] uppercase tracking-[0.18em] text-white/50'>Care team portal</span></span></Link>
          <div className='mt-6'>{role ? <Navigation role={role} pathname={pathname} /> : null}</div>
          <div className='mt-auto border-t border-white/15 pt-5'><p className='truncate text-sm font-bold'>{me?.user.full_name}</p><p className='mt-1 text-xs capitalize text-white/55'>{role}</p><Button variant='ghost' size='sm' className='mt-4 text-white hover:bg-white/10 hover:text-white' onClick={() => void logout()}><LogOut className='size-4' /> Sign out</Button></div>
        </aside>

        <div className='min-w-0'>
          <header className='flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden'>
            <Link href='/' className='font-display text-lg'>Aether Clinic</Link>
            <details className='group relative'><summary className='grid size-10 cursor-pointer list-none place-items-center rounded-md border border-border' aria-label='Open portal navigation'><Menu className='size-5' /></summary><div className='absolute right-0 top-12 z-40 w-64 rounded-lg bg-primary p-3 text-white'>{role ? <Navigation role={role} pathname={pathname} /> : null}<div className='mt-3 border-t border-white/15 pt-3'><button className='flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold' onClick={() => void logout()}><LogOut className='size-4' />Sign out</button></div></div></details>
          </header>
          <main className='workspace-max py-6 sm:py-9'>{children}</main>
        </div>
      </div>
    </Protected>
  );
}
