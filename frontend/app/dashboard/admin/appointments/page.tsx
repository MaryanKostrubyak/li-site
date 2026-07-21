'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatClinicDateTime } from '@/lib/datetime';

const allowed: Record<string, string[]> = { new: ['confirmed', 'canceled'], confirmed: ['completed', 'no_show', 'canceled'] };

export default function AdminAppointmentsPage() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['admin-appointments'], queryFn: api.adminAppointments });
  const update = useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => api.adminUpdateAppointment(id, { status: status as never }), onSuccess: () => void client.invalidateQueries({ queryKey: ['admin-appointments'] }) });
  return <div className='space-y-8'><PageHeader title='Appointments' subtitle='A complete clinic schedule with deliberate status transitions.' action={<Link href='/dashboard/admin/appointments/new'><Button>New appointment</Button></Link>} />{query.error ? <Alert variant='danger'>Could not load appointments. <button className='underline' onClick={() => void query.refetch()}>Try again</button></Alert> : null}<div className='surface overflow-x-auto'><table className='w-full min-w-[820px] text-left text-sm'><thead className='border-b border-border bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground'><tr><th className='p-4'>Patient</th><th className='p-4'>Visit</th><th className='p-4'>Time</th><th className='p-4'>Status</th><th className='p-4'>Next action</th></tr></thead><tbody className='divide-y divide-border'>{(query.data ?? []).map((appointment) => <tr key={appointment.id}><td className='p-4'><p className='font-bold'>{appointment.patient.name}</p><p className='text-xs text-muted-foreground'>{appointment.patient.email}</p></td><td className='p-4'>{appointment.service.name}<p className='text-xs text-muted-foreground'>{appointment.doctor.name}</p></td><td className='p-4'>{formatClinicDateTime(appointment.start_at)}</td><td className='p-4'><StatusBadge status={appointment.status} /></td><td className='p-4'><Select aria-label={`Update ${appointment.patient.name} appointment status`} defaultValue='' disabled={!allowed[appointment.status]} onChange={(event) => update.mutate({ id: appointment.id, status: event.target.value })}><option value=''>Choose…</option>{(allowed[appointment.status] ?? []).map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</Select></td></tr>)}</tbody></table></div><p className='text-sm text-danger' aria-live='polite'>{update.error?.message}</p></div>;
}
