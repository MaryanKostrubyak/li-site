'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CalendarClock, History } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Protected } from '@/components/shared/protected';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatClinicDateTime } from '@/lib/datetime';
import type { Appointment } from '@/types/api';

export default function PatientDashboardPage() {
  const queryClient = useQueryClient();
  const [reschedule, setReschedule] = useState<Appointment | null>(null);
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [message, setMessage] = useState('');
  const upcoming = useQuery({ queryKey: ['patient-upcoming'], queryFn: api.patientUpcoming });
  const history = useQuery({ queryKey: ['patient-history'], queryFn: api.patientHistory });
  const profile = useQuery({ queryKey: ['patient-profile'], queryFn: api.patientProfile });
  const slots = useQuery({
    queryKey: ['reschedule-slots', reschedule?.doctor_id, reschedule?.service_id, date],
    queryFn: () => api.getDoctorSlots(reschedule!.doctor_id!, reschedule!.service_id!, date),
    enabled: Boolean(reschedule?.doctor_id && reschedule?.service_id && date)
  });
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['patient-upcoming'] }); void queryClient.invalidateQueries({ queryKey: ['patient-history'] }); };
  const cancel = useMutation({ mutationFn: (id: string) => api.cancelAppointment(id, 'Canceled by patient'), onSuccess: () => { setMessage('Appointment canceled.'); refresh(); } });
  const move = useMutation({ mutationFn: () => api.rescheduleAppointment(reschedule!.id, slot), onSuccess: () => { setMessage('Appointment moved. Your previous time remains in history.'); setReschedule(null); setDate(''); setSlot(''); refresh(); } });
  const preferences = useMutation({ mutationFn: (enabled: boolean) => api.updatePatientProfile({ notification_email_enabled: enabled }), onSuccess: () => void profile.refetch() });

  return (
    <Protected role='patient'>
      <div className='space-y-10'>
        <PageHeader title='Your appointments' subtitle='Review upcoming care, make changes through available clinic times, and keep your preferences current.' action={<Link href='/book'><Button>Book another visit</Button></Link>} />
        <p className='sr-only' aria-live='polite'>{message}</p>

        <section className='grid gap-6 xl:grid-cols-[1.25fr,0.75fr]'>
          <div className='surface p-5 sm:p-6'>
            <div className='flex items-center gap-2'><CalendarClock className='size-5 text-success' /><h2 className='panel-title'>Upcoming</h2></div>
            {upcoming.error ? <Alert variant='danger' className='mt-5'>Could not load appointments. <button className='underline' onClick={() => void upcoming.refetch()}>Try again</button></Alert> : null}
            <div className='mt-5 divide-y divide-border border-y border-border'>
              {(upcoming.data ?? []).length === 0 ? <div className='py-6'><EmptyState title='No upcoming visits' description='A confirmed booking will appear here.' /></div> : (upcoming.data ?? []).map((appointment) => (
                <article key={appointment.id} className='py-5'>
                  <div className='flex flex-wrap items-start justify-between gap-3'><div><p className='font-bold'>{formatClinicDateTime(appointment.start_at)}</p><p className='mt-2 text-sm text-muted-foreground'>{appointment.reason}</p></div><StatusBadge status={appointment.status} /></div>
                  <div className='mt-4 flex gap-2'><Button variant='outline' size='sm' onClick={() => { setReschedule(appointment); setSlot(''); }}>Choose a new time</Button><Button variant='ghost' size='sm' onClick={() => cancel.mutate(appointment.id)}>Cancel</Button></div>
                </article>
              ))}
            </div>

            {reschedule ? <div className='mt-6 rounded-lg border border-success bg-[#E7ECE7] p-5' role='dialog' aria-labelledby='reschedule-title'>
              <h3 id='reschedule-title' className='font-display text-xl'>Reschedule through availability</h3><p className='mt-2 text-sm text-muted-foreground'>Select a clinic date, then choose an open PT time.</p>
              <div className='mt-4 max-w-xs'><label className='field-label' htmlFor='reschedule-date'>Clinic date</label><Input id='reschedule-date' className='mt-2' type='date' value={date} onChange={(event) => { setDate(event.target.value); setSlot(''); }} /></div>
              <div className='mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3'>{(slots.data?.slots ?? []).map((item) => <button key={item.start_at} type='button' aria-pressed={slot === item.start_at} className={`rounded-md border px-3 py-2 text-sm ${slot === item.start_at ? 'bg-primary text-white' : 'bg-card'}`} onClick={() => setSlot(item.start_at)}>{formatClinicDateTime(item.start_at)}</button>)}</div>
              <div className='mt-5 flex gap-2'><Button size='sm' disabled={!slot || move.isPending} onClick={() => move.mutate()}>Confirm new time</Button><Button size='sm' variant='ghost' onClick={() => setReschedule(null)}>Close</Button></div>
            </div> : null}
          </div>

          <aside className='surface p-5 sm:p-6'>
            <div className='flex items-center gap-2'><Bell className='size-5 text-success' /><h2 className='panel-title'>Preferences</h2></div>
            <div className='mt-5 flex items-center justify-between border-y border-border py-4'><span className='text-sm'>Email reminders</span><button type='button' role='switch' aria-checked={profile.data?.notification_email_enabled ?? false} onClick={() => preferences.mutate(!(profile.data?.notification_email_enabled ?? false))} className={`relative h-7 w-12 rounded-full ${profile.data?.notification_email_enabled ? 'bg-success' : 'bg-border'}`}><span className={`absolute top-1 size-5 rounded-full bg-white transition ${profile.data?.notification_email_enabled ? 'left-6' : 'left-1'}`} /></button></div>
            <div className='mt-5 rounded-lg border border-dashed border-border p-4'><p className='text-sm font-bold'>Text reminders</p><p className='mt-1 text-xs leading-5 text-muted-foreground'>Text reminders are not available yet.</p></div>
          </aside>
        </section>

        <section className='surface p-5 sm:p-6'>
          <div className='flex items-center gap-2'><History className='size-5 text-accent' /><h2 className='panel-title'>History</h2></div>
          <div className='mt-5 divide-y divide-border border-y border-border'>{(history.data ?? []).map((appointment) => <article key={appointment.id} className='grid gap-2 py-4 sm:grid-cols-[220px,1fr,auto]'><p className='text-sm font-bold'>{formatClinicDateTime(appointment.start_at)}</p><p className='text-sm text-muted-foreground'>{appointment.reason}</p><StatusBadge status={appointment.status} /></article>)}</div>
        </section>
      </div>
    </Protected>
  );
}
