'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { formatClinicDateTime } from '@/lib/datetime';

export default function DoctorAppointmentPage() {
  const { id } = useParams<{ id: string }>();
  const client = useQueryClient();
  const [raw, setRaw] = useState(''); const [preview, setPreview] = useState('');
  const query = useQuery({ queryKey: ['doctor-appointment', id], queryFn: () => api.doctorAppointment(id) });
  const improve = useMutation({ mutationFn: () => api.doctorPreviewNote(id, raw), onSuccess: (result) => setPreview(result.preview) });
  const save = useMutation({ mutationFn: () => api.doctorAddNote(id, { raw_note: raw, formatted_note: preview || raw }), onSuccess: () => { setRaw(''); setPreview(''); void client.invalidateQueries({ queryKey: ['doctor-appointment', id] }); } });
  const update = useMutation({ mutationFn: (status: string) => api.doctorUpdateStatus(id, status), onSuccess: () => void client.invalidateQueries({ queryKey: ['doctor-appointment', id] }) });
  const visit = query.data;
  return <div className='space-y-8'><PageHeader title={visit?.patient.name ?? 'Visit detail'} subtitle={visit ? `${visit.service.name} · ${formatClinicDateTime(visit.start_at)}` : 'Loading visit…'} action={visit ? <StatusBadge status={visit.status} /> : undefined} />{query.error ? <Alert variant='danger'>Could not load this visit. <button className='underline' onClick={() => void query.refetch()}>Try again</button></Alert> : null}{visit ? <><section className='grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2'><div className='bg-card p-5'><p className='kicker'>Patient</p><p className='mt-3 font-bold'>{visit.patient.name}</p><p className='mt-1 text-sm text-muted-foreground'>{visit.patient.email}</p></div><div className='bg-card p-5'><p className='kicker'>Reason for visit</p><p className='mt-3 text-sm leading-6'>{visit.reason}</p></div></section><div className='flex gap-2'>{visit.status === 'new' ? <Button onClick={() => update.mutate('confirmed')}>Confirm visit</Button> : null}{visit.status === 'confirmed' ? <><Button onClick={() => update.mutate('completed')}>Mark completed</Button><Button variant='outline' onClick={() => update.mutate('no_show')}>Mark no-show</Button></> : null}</div><section className='surface p-6'><h2 className='font-display text-2xl'>Visit notes</h2><p className='mt-2 text-sm text-muted-foreground'>Write the clinical note. “Improve wording” creates a preview only; nothing is saved until you confirm.</p><div className='mt-5'><label className='field-label' htmlFor='visit-note'>Draft note</label><Textarea id='visit-note' className='mt-2' rows={6} value={raw} onChange={(event) => { setRaw(event.target.value); setPreview(''); }} /></div><Button className='mt-4' variant='outline' disabled={raw.length < 3 || improve.isPending} onClick={() => improve.mutate()}>Improve wording</Button>{preview ? <div className='mt-5 rounded-lg border border-success bg-[#E7ECE7] p-5' aria-live='polite'><p className='kicker'>Preview</p><p className='mt-3 whitespace-pre-wrap text-sm leading-6'>{preview}</p><Button className='mt-4' size='sm' onClick={() => save.mutate()}>Save this note</Button></div> : raw.length >= 3 ? <Button className='ml-2 mt-4' size='sm' onClick={() => save.mutate()}>Save without changes</Button> : null}{improve.error || save.error ? <Alert variant='danger' className='mt-4'>{improve.error?.message ?? save.error?.message}</Alert> : null}<div className='mt-8 divide-y divide-border border-y border-border'>{visit.notes.map((note) => <article key={note.id} className='py-5'><p className='text-xs text-muted-foreground'>{new Date(note.created_at).toLocaleString()}</p><p className='mt-2 whitespace-pre-wrap text-sm leading-6'>{note.formatted_note}</p></article>)}</div></section></> : null}</div>;
}
