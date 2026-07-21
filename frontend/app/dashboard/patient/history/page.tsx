'use client';

import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert } from '@/components/ui/alert';
import { api } from '@/lib/api';
import { formatClinicDateTime } from '@/lib/datetime';

export default function PatientHistoryPage() { const query = useQuery({ queryKey: ['patient-history'], queryFn: api.patientHistory }); return <div className='space-y-8'><PageHeader title='Visit history' subtitle='Completed, missed, canceled, and rescheduled appointments remain available for context.' />{query.error ? <Alert variant='danger'>Could not load history. <button className='underline' onClick={() => void query.refetch()}>Try again</button></Alert> : null}<div className='divide-y divide-border border-y border-border'>{query.data?.map((appointment) => <article key={appointment.id} className='grid gap-3 py-5 sm:grid-cols-[230px,1fr,auto]'><p className='font-bold'>{formatClinicDateTime(appointment.start_at)}</p><p className='text-sm text-muted-foreground'>{appointment.reason}</p><StatusBadge status={appointment.status} /></article>)}</div></div>; }
