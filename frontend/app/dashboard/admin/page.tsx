'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, Stethoscope, UsersRound } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/shared/page-header';
import { Protected } from '@/components/shared/protected';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

const metrics = [
  { key: 'upcoming_appointments', label: 'Upcoming appointments', icon: CalendarDays },
  { key: 'total_patients', label: 'Patients', icon: UsersRound },
  { key: 'total_doctors', label: 'Doctors', icon: Stethoscope },
  { key: 'completed_last_7_days', label: 'Completed this week', icon: CheckCircle2 }
] as const;

export default function AdminDashboardPage() {
  const query = useQuery({ queryKey: ['admin-metrics'], queryFn: api.adminMetrics });
  return (
    <Protected role='admin'>
      <div className='space-y-10'>
        <PageHeader title='Clinic overview' subtitle='The essentials for today, with focused pages for appointments and patient follow-up.' action={<Link href='/dashboard/admin/appointments/new'><Button>New appointment</Button></Link>} />
        {query.error ? <Alert variant='danger'>Metrics are unavailable. <button className='underline' onClick={() => void query.refetch()}>Try again</button></Alert> : null}
        <section className='grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 xl:grid-cols-4' aria-busy={query.isLoading}>
          {metrics.map((metric) => { const Icon = metric.icon; return <article key={metric.key} className='bg-card p-6'><Icon className='size-5 text-success' /><p className='mt-5 text-sm text-muted-foreground'>{metric.label}</p><p className='mt-2 font-display text-4xl'>{query.data?.[metric.key] ?? '—'}</p></article>; })}
        </section>
        <section className='grid gap-5 md:grid-cols-2'>
          <Link href='/dashboard/admin/appointments' className='surface p-6 transition hover:border-success'><p className='kicker'>Operations</p><h2 className='mt-3 font-display text-2xl'>Review appointments</h2><p className='mt-3 text-sm leading-6 text-muted-foreground'>Filter the schedule and move each visit through its valid status.</p></Link>
          <Link href='/dashboard/admin/patients' className='surface p-6 transition hover:border-success'><p className='kicker'>Patient CRM</p><h2 className='mt-3 font-display text-2xl'>Manage follow-up</h2><p className='mt-3 text-sm leading-6 text-muted-foreground'>Open patient history, tags, internal notes, and admin-only follow-up status.</p></Link>
        </section>
      </div>
    </Protected>
  );
}
