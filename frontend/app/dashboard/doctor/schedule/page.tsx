'use client';

import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/page-header';
import { Alert } from '@/components/ui/alert';
import { api } from '@/lib/api';

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export default function DoctorSchedulePage() { const query = useQuery({ queryKey: ['doctor-schedule'], queryFn: api.doctorSchedule }); return <div className='space-y-8'><PageHeader title='Weekly schedule' subtitle='Recurring clinic availability interpreted in Pacific Time.' />{query.error ? <Alert variant='danger'>Could not load schedule. <button className='underline' onClick={() => void query.refetch()}>Try again</button></Alert> : null}<div className='divide-y divide-border border-y border-border'>{query.data?.map((slot) => <div key={slot.id} className='grid gap-2 py-5 sm:grid-cols-[180px,1fr]'><p className='font-bold'>{weekdays[slot.weekday]}</p><p className='text-sm'>{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)} PT <span className='ml-3 text-muted-foreground'>{slot.slot_interval_minutes}-minute starts</span></p></div>)}</div></div>; }
