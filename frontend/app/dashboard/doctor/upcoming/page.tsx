'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatClinicDateTime } from '@/lib/datetime';

export default function DoctorUpcomingPage() { const query = useQuery({ queryKey: ['doctor-upcoming'], queryFn: api.doctorUpcoming }); return <div className='space-y-8'><PageHeader title='Upcoming visits' subtitle='Future appointments assigned to you, shown in Pacific Time.' />{query.error ? <Alert variant='danger'>Could not load upcoming visits. <button className='underline' onClick={() => void query.refetch()}>Try again</button></Alert> : null}<div className='divide-y divide-border border-y border-border'>{query.data?.map((appointment) => <article key={appointment.id} className='grid gap-3 py-5 sm:grid-cols-[230px,1fr,auto] sm:items-center'><div><p className='font-bold'>{formatClinicDateTime(appointment.start_at)}</p><div className='mt-2'><StatusBadge status={appointment.status} /></div></div><p className='text-sm text-muted-foreground'>{appointment.reason}</p><Link href={`/dashboard/doctor/appointments/${appointment.id}`}><Button variant='outline' size='sm'>Open</Button></Link></article>)}</div></div>; }
