'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { PageHeader } from '@/components/shared/page-header';
import { Alert } from '@/components/ui/alert';
import { api } from '@/lib/api';

export default function AdminPatientsPage() {
  const query = useQuery({ queryKey: ['admin-patients'], queryFn: api.adminPatients });
  return <div className='space-y-8'><PageHeader title='Patients' subtitle='Contact details and clinic-managed follow-up at a glance.' />{query.error ? <Alert variant='danger'>Could not load patients. <button className='underline' onClick={() => void query.refetch()}>Try again</button></Alert> : null}<div className='divide-y divide-border border-y border-border'>{(query.data ?? []).map((patient) => <Link key={patient.id} href={`/dashboard/admin/patients/${patient.id}`} className='grid gap-3 py-5 hover:pl-2 sm:grid-cols-[1fr,1fr,160px]'><div><p className='font-bold'>{patient.full_name}</p><p className='text-sm text-muted-foreground'>{patient.email}</p></div><p className='text-sm'>{patient.phone ?? 'No phone'}</p><p className='text-sm capitalize'>{patient.follow_up_status.replace('_', ' ')}</p></Link>)}</div></div>;
}
