'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/page-header';
import { Alert } from '@/components/ui/alert';
import { api } from '@/lib/api';

export default function PatientProfilePage() {
  const query = useQuery({ queryKey: ['patient-profile'], queryFn: api.patientProfile });
  const update = useMutation({ mutationFn: (enabled: boolean) => api.updatePatientProfile({ notification_email_enabled: enabled }), onSuccess: () => void query.refetch() });
  const enabled = query.data?.notification_email_enabled ?? false;
  return <div className='space-y-8'><PageHeader title='Profile & preferences' subtitle='Personal details and understandable notification choices. Clinic follow-up status is managed by staff.' />{query.error ? <Alert variant='danger'>Could not load your profile. <button className='underline' onClick={() => void query.refetch()}>Try again</button></Alert> : null}<section className='surface max-w-2xl p-6'><div className='flex items-center justify-between border-y border-border py-5'><div><p className='font-bold'>Email reminders</p><p className='mt-1 text-sm text-muted-foreground'>Appointment confirmations and scheduled reminders.</p></div><button role='switch' aria-checked={enabled} aria-label='Email reminders' onClick={() => update.mutate(!enabled)} className={`relative h-7 w-12 rounded-full ${enabled ? 'bg-success' : 'bg-border'}`}><span className={`absolute top-1 size-5 rounded-full bg-white ${enabled ? 'left-6' : 'left-1'}`} /></button></div><div className='mt-6 rounded-lg border border-dashed border-border p-4'><p className='font-bold'>Text reminders</p><p className='mt-1 text-sm text-muted-foreground'>Text reminders are not available yet.</p></div><p className='mt-5 text-sm text-success' aria-live='polite'>{update.isSuccess ? 'Preferences saved.' : ''}</p></section></div>;
}
