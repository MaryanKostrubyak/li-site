'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { formatClinicDateTime } from '@/lib/datetime';
import type { AdminPatientSummary } from '@/types/api';

export default function AdminPatientDetailPage() {
  const { id } = useParams<{ id: string }>(); const client = useQueryClient(); const [tag, setTag] = useState(''); const [note, setNote] = useState('');
  const query = useQuery({ queryKey: ['admin-patient', id], queryFn: () => api.adminPatientDetail(id) });
  const refresh = () => void client.invalidateQueries({ queryKey: ['admin-patient', id] });
  const followUp = useMutation({ mutationFn: (status: AdminPatientSummary['follow_up_status']) => api.adminUpdatePatient(id, status), onSuccess: refresh });
  const addTag = useMutation({ mutationFn: () => api.adminAddTag(id, tag), onSuccess: () => { setTag(''); refresh(); } });
  const addNote = useMutation({ mutationFn: () => api.adminAddNote(id, note), onSuccess: () => { setNote(''); refresh(); } });
  const data = query.data;
  return <div className='space-y-8'><PageHeader title={data?.patient.full_name ?? 'Patient detail'} subtitle='Clinic-managed follow-up, internal context, and appointment history.' />{query.error ? <Alert variant='danger'>Could not load this patient. <button className='underline' onClick={() => void query.refetch()}>Try again</button></Alert> : null}{data ? <><section className='grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3'><div className='bg-card p-5'><p className='kicker'>Contact</p><p className='mt-3 font-bold'>{data.patient.email}</p><p className='mt-1 text-sm text-muted-foreground'>{data.patient.phone ?? 'No phone'}</p></div><div className='bg-card p-5'><label className='kicker' htmlFor='follow-up'>Follow-up</label><Select id='follow-up' className='mt-3' value={data.patient.follow_up_status} onChange={(event) => followUp.mutate(event.target.value as AdminPatientSummary['follow_up_status'])}><option value='none'>None</option><option value='needed'>Needed</option><option value='scheduled'>Scheduled</option><option value='done'>Done</option></Select></div><div className='bg-card p-5'><p className='kicker'>Source</p><p className='mt-3 capitalize'>{data.patient.lead_source ?? 'Unknown'}</p></div></section><section className='grid gap-6 lg:grid-cols-2'><div className='surface p-5'><h2 className='font-display text-2xl'>Tags</h2><div className='mt-4 flex flex-wrap gap-2'>{data.tags.map((item) => <span key={item.id} className='rounded-full border border-border px-3 py-1 text-xs'>{item.tag}</span>)}</div><form className='mt-5 flex gap-2' onSubmit={(event) => { event.preventDefault(); addTag.mutate(); }}><label className='sr-only' htmlFor='new-tag'>New tag</label><Input id='new-tag' value={tag} onChange={(event) => setTag(event.target.value)} placeholder='Add a tag' /><Button type='submit' disabled={tag.length < 2}>Add</Button></form></div><div className='surface p-5'><h2 className='font-display text-2xl'>Internal notes</h2><div className='mt-4 divide-y divide-border border-y border-border'>{data.notes.map((item) => <p key={item.id} className='py-3 text-sm leading-6'>{item.note}</p>)}</div><form className='mt-5' onSubmit={(event) => { event.preventDefault(); addNote.mutate(); }}><label className='field-label' htmlFor='internal-note'>New internal note</label><Textarea id='internal-note' className='mt-2' value={note} onChange={(event) => setNote(event.target.value)} /><Button className='mt-3' type='submit' disabled={note.length < 3}>Save note</Button></form></div></section><section className='surface p-5'><h2 className='font-display text-2xl'>Appointment history</h2><div className='mt-4 divide-y divide-border border-y border-border'>{data.appointments.map((appointment) => <article key={appointment.id} className='grid gap-2 py-4 sm:grid-cols-[220px,1fr,auto]'><p className='font-bold'>{formatClinicDateTime(appointment.start_at)}</p><p className='text-sm text-muted-foreground'>{appointment.reason}</p><StatusBadge status={appointment.status} /></article>)}</div></section></> : null}</div>;
}
