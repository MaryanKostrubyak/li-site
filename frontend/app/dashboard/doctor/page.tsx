'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Protected } from '@/components/shared/protected';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatClinicTime } from '@/lib/datetime';

export default function DoctorDashboardPage() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['doctor-today'], queryFn: api.doctorToday });
  const update = useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => api.doctorUpdateStatus(id, status), onSuccess: () => void client.invalidateQueries({ queryKey: ['doctor-today'] }) });
  return <Protected role='doctor'><div className='space-y-8'><PageHeader title='Today' subtitle='Your visit queue in Pacific Time. Open a visit for patient context and notes.' />{query.error ? <Alert variant='danger'>Could not load today’s visits. <button className='underline' onClick={() => void query.refetch()}>Try again</button></Alert> : null}<div className='divide-y divide-border border-y border-border'>{(query.data ?? []).length === 0 ? <div className='py-8'><EmptyState title='No visits today' description='Upcoming appointments are available from the sidebar.' /></div> : query.data?.map((appointment) => <article key={appointment.id} className='grid gap-4 py-5 md:grid-cols-[110px,1fr,auto] md:items-center'><div><p className='font-display text-xl'>{formatClinicTime(appointment.start_at)}</p><div className='mt-2'><StatusBadge status={appointment.status} /></div></div><div><p className='font-bold'>{appointment.service?.name ?? 'Scheduled visit'}</p><p className='mt-1 text-sm text-muted-foreground'>{appointment.reason}</p></div><div className='flex gap-2'>{appointment.status === 'new' ? <Button size='sm' onClick={() => update.mutate({ id: appointment.id, status: 'confirmed' })}>Confirm</Button> : null}<Link href={`/dashboard/doctor/appointments/${appointment.id}`}><Button variant='outline' size='sm'>Open visit</Button></Link></div></article>)}</div><p className='text-sm text-danger' aria-live='polite'>{update.error?.message}</p></div></Protected>;
}
