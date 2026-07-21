'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { PageHeader } from '@/components/shared/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { doctorsForService } from '@/lib/booking';
import { formatClinicTime } from '@/lib/datetime';

export default function NewAdminAppointmentPage() {
  const [patient, setPatient] = useState(''); const [service, setService] = useState(''); const [doctor, setDoctor] = useState(''); const [date, setDate] = useState(''); const [slot, setSlot] = useState(''); const [reason, setReason] = useState('');
  const patients = useQuery({ queryKey: ['admin-patients'], queryFn: api.adminPatients });
  const services = useQuery({ queryKey: ['services'], queryFn: api.getServices });
  const doctors = useQuery({ queryKey: ['doctors'], queryFn: api.getDoctors });
  const compatible = useMemo(() => doctorsForService(doctors.data ?? [], service), [doctors.data, service]);
  const slots = useQuery({ queryKey: ['admin-slots', doctor, service, date], queryFn: () => api.getDoctorSlots(doctor, service, date), enabled: Boolean(doctor && service && date) });
  const create = useMutation({ mutationFn: () => api.adminCreateAppointment({ patient_id: patient, service_id: service, doctor_id: doctor, start_at: slot, reason, source_channel: 'admin' }) });
  return <div className='space-y-8'><PageHeader title='New appointment' subtitle='Choose the patient first, then use the same real availability shown to patients.' /><form className='surface max-w-3xl space-y-6 p-6' onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
    <div><label className='field-label' htmlFor='patient'>Patient</label><Select id='patient' className='mt-2' value={patient} onChange={(event) => setPatient(event.target.value)} required><option value=''>Choose patient</option>{patients.data?.map((item) => <option key={item.id} value={item.id}>{item.full_name} — {item.email}</option>)}</Select></div>
    <div className='grid gap-5 sm:grid-cols-2'><div><label className='field-label' htmlFor='service'>Service</label><Select id='service' className='mt-2' value={service} onChange={(event) => { setService(event.target.value); setDoctor(''); setSlot(''); }} required><option value=''>Choose service</option>{services.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></div><div><label className='field-label' htmlFor='doctor'>Doctor</label><Select id='doctor' className='mt-2' value={doctor} onChange={(event) => { setDoctor(event.target.value); setSlot(''); }} required><option value=''>Choose compatible doctor</option>{compatible.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</Select></div></div>
    <div><label className='field-label' htmlFor='date'>Clinic date</label><Input id='date' className='mt-2 max-w-xs' type='date' value={date} onChange={(event) => { setDate(event.target.value); setSlot(''); }} required /></div>
    <fieldset><legend className='field-label'>Available PT time</legend><div className='mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4'>{slots.data?.slots.map((item) => <button key={item.start_at} type='button' aria-pressed={slot === item.start_at} className={`rounded-md border px-3 py-3 text-sm font-bold ${slot === item.start_at ? 'bg-primary text-white' : 'bg-card'}`} onClick={() => setSlot(item.start_at)}>{formatClinicTime(item.start_at)}</button>)}</div></fieldset>
    <div><label className='field-label' htmlFor='reason'>Visit reason</label><Textarea id='reason' className='mt-2' value={reason} onChange={(event) => setReason(event.target.value)} required minLength={3} /></div>
    <Button type='submit' disabled={!patient || !service || !doctor || !slot || reason.length < 3 || create.isPending}>Create appointment</Button>
    {create.isSuccess ? <Alert variant='success'>Appointment created.</Alert> : null}{create.error ? <Alert variant='danger'>{create.error.message}</Alert> : null}
  </form></div>;
}
