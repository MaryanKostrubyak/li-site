'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Clock3, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ApiClientError, api } from '@/lib/api';
import { canContinueBooking, doctorsForService, recoverFromSlotConflict } from '@/lib/booking';
import { useAuth } from '@/lib/auth-context';
import { formatClinicTime } from '@/lib/datetime';
import type { Appointment, BookingDraft } from '@/types/api';

const steps = ['Care', 'Time', 'Account', 'Review'];
const clinicDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

function BookingWizard() {
  const params = useSearchParams();
  const { me, login, register } = useAuth();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<BookingDraft>({
    serviceId: params.get('service') ?? '', doctorId: params.get('doctor') ?? '', date: '', slotStart: '', reason: '', consent: false
  });
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState<Appointment | null>(null);

  const services = useQuery({ queryKey: ['services'], queryFn: api.getServices });
  const doctors = useQuery({ queryKey: ['doctors'], queryFn: api.getDoctors });
  const compatibleDoctors = useMemo(() => doctorsForService(doctors.data ?? [], draft.serviceId), [doctors.data, draft.serviceId]);
  const slots = useQuery({
    queryKey: ['slots', draft.doctorId, draft.serviceId, draft.date],
    queryFn: () => api.getDoctorSlots(draft.doctorId, draft.serviceId, draft.date),
    enabled: Boolean(draft.doctorId && draft.serviceId && draft.date)
  });
  const selectedService = services.data?.find((item) => item.id === draft.serviceId);
  const selectedDoctor = doctors.data?.find((item) => item.id === draft.doctorId);

  const authenticate = useMutation({
    mutationFn: () => authMode === 'login' ? login({ email, password }) : register({ email, password, full_name: fullName, phone: phone || undefined }),
    onSuccess: () => { setNotice('Account confirmed. You can review the visit now.'); setStep(4); }
  });
  const booking = useMutation({
    mutationFn: () => api.createAppointment({ service_id: draft.serviceId, doctor_id: draft.doctorId, start_at: draft.slotStart, reason: draft.reason }),
    onSuccess: (appointment) => { setSuccess(appointment); setNotice('Appointment confirmed.'); },
    onError: (error) => {
      if (error instanceof ApiClientError && error.code === 'slot_unavailable') {
        const recovered = recoverFromSlotConflict(draft);
        setDraft(recovered.draft); setStep(recovered.step); setNotice('That time was just taken. We refreshed the available times.'); void slots.refetch();
      }
    }
  });

  const update = <K extends keyof BookingDraft>(key: K, value: BookingDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const next = () => {
    if (step === 1 && !compatibleDoctors.some((doctor) => doctor.id === draft.doctorId)) { setNotice('Choose a doctor who provides this service.'); return; }
    if (step === 3 && me?.user.role === 'patient') { setStep(4); return; }
    if (canContinueBooking(step, draft, me?.user.role === 'patient')) setStep((current) => Math.min(4, current + 1));
    else setNotice('Complete this step before continuing.');
  };

  if (success) {
    return (
      <div className='container-max page-y'>
        <section className='mx-auto max-w-2xl border-y border-border py-12 text-center' aria-live='polite'>
          <span className='mx-auto grid size-12 place-items-center rounded-full bg-success text-white'><Check className='size-6' /></span>
          <p className='kicker mt-6'>Appointment confirmed</p>
          <h1 className='mt-3 font-display text-4xl'>You’re all set.</h1>
          <p className='mt-5 text-lg'>Reference <strong>{success.reference_code}</strong></p>
          <dl className='mx-auto mt-8 grid max-w-md gap-3 border-y border-border py-6 text-left text-sm'>
            <div className='flex justify-between gap-4'><dt className='text-muted-foreground'>Visit</dt><dd>{success.service?.name}</dd></div>
            <div className='flex justify-between gap-4'><dt className='text-muted-foreground'>Doctor</dt><dd>{success.doctor?.name}</dd></div>
            <div className='flex justify-between gap-4'><dt className='text-muted-foreground'>Time</dt><dd>{formatClinicTime(success.start_at)}</dd></div>
          </dl>
          <Link href='/dashboard/patient'><Button size='lg' className='mt-8'>Open patient portal <ArrowRight className='size-4' /></Button></Link>
        </section>
      </div>
    );
  }

  return (
    <div className='container-max page-y'>
      <div className='grid gap-10 lg:grid-cols-[260px,1fr]'>
        <aside className='lg:sticky lg:top-28 lg:h-fit'>
          <p className='kicker'>Book a visit</p>
          <h1 className='mt-4 font-display text-4xl'>One step at a time.</h1>
          <ol className='mt-8 border-y border-border'>
            {steps.map((label, index) => {
              const number = index + 1;
              return <li key={label} className={`flex items-center gap-3 border-b border-border py-4 last:border-0 ${step === number ? 'font-bold' : 'text-muted-foreground'}`} aria-current={step === number ? 'step' : undefined}><span className='grid size-7 place-items-center rounded-full border border-current text-xs'>{number}</span>{label}</li>;
            })}
          </ol>
          <p className='mt-5 text-xs leading-5 text-muted-foreground'>Times are shown in Pacific Time (PT).</p>
        </aside>

        <main className='min-w-0'>
          <div className='mb-6 min-h-6 text-sm' aria-live='polite'>{notice}</div>
          {(services.error || doctors.error) ? <Alert variant='danger'>We could not load booking options. <button className='underline' onClick={() => { void services.refetch(); void doctors.refetch(); }}>Try again</button></Alert> : null}

          {step === 1 ? (
            <section aria-labelledby='step-one-title'>
              <p className='kicker'>Step 1 of 4</p><h2 id='step-one-title' className='page-title mt-3'>What can we help with?</h2>
              <div className='mt-8 grid gap-3 sm:grid-cols-2'>
                {(services.data ?? []).map((service) => <button key={service.id} type='button' aria-pressed={draft.serviceId === service.id} onClick={() => setDraft((current) => ({ ...current, serviceId: service.id, doctorId: current.serviceId === service.id ? current.doctorId : '', slotStart: '' }))} className={`rounded-lg border p-5 text-left focus-ring ${draft.serviceId === service.id ? 'border-success bg-[#E7ECE7]' : 'border-border bg-card hover:border-success'}`}><span className='font-display text-xl'>{service.name}</span><span className='mt-2 block text-sm leading-6 text-muted-foreground'>{service.duration_minutes} minutes · ${Number(service.price).toFixed(0)}</span></button>)}
              </div>
              {draft.serviceId ? <><h3 className='mt-10 font-display text-2xl'>Choose a doctor</h3><div className='mt-4 grid gap-3 sm:grid-cols-2'>{compatibleDoctors.map((doctor) => <button key={doctor.id} type='button' aria-pressed={draft.doctorId === doctor.id} onClick={() => { update('doctorId', doctor.id); update('slotStart', ''); }} className={`rounded-lg border p-5 text-left focus-ring ${draft.doctorId === doctor.id ? 'border-success bg-[#E7ECE7]' : 'border-border bg-card hover:border-success'}`}><span className='font-bold'>{doctor.full_name}</span><span className='mt-1 block text-sm text-muted-foreground'>{doctor.specialty}</span></button>)}</div></> : null}
            </section>
          ) : null}

          {step === 2 ? (
            <section aria-labelledby='step-two-title'>
              <p className='kicker'>Step 2 of 4</p><h2 id='step-two-title' className='page-title mt-3'>Choose a clinic time.</h2>
              <div className='mt-8 max-w-sm'><label className='field-label' htmlFor='clinic-date'>Clinic date</label><Input id='clinic-date' className='mt-2' type='date' min={clinicDate()} value={draft.date} onChange={(event) => { update('date', event.target.value); update('slotStart', ''); }} /></div>
              <div className='mt-8'><div className='flex items-center gap-2'><Clock3 className='size-4 text-success' /><h3 className='font-bold'>Available times</h3></div><div className='mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4'>{(slots.data?.slots ?? []).map((slot) => <button key={slot.start_at} type='button' aria-pressed={draft.slotStart === slot.start_at} onClick={() => update('slotStart', slot.start_at)} className={`rounded-md border px-3 py-3 text-sm font-bold focus-ring ${draft.slotStart === slot.start_at ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-success'}`}>{formatClinicTime(slot.start_at)}</button>)}</div>{draft.date && !slots.isFetching && slots.data?.slots.length === 0 ? <p className='mt-5 text-sm text-muted-foreground'>No appointments on this date. Try another day.</p> : null}</div>
            </section>
          ) : null}

          {step === 3 ? (
            <section aria-labelledby='step-three-title'>
              <p className='kicker'>Step 3 of 4</p><h2 id='step-three-title' className='page-title mt-3'>{me?.user.role === 'patient' ? 'Your account is ready.' : 'Save the visit to your account.'}</h2>
              {me?.user.role === 'patient' ? <div className='mt-8 border-y border-border py-6'><p className='font-bold'>{me.user.full_name}</p><p className='mt-1 text-sm text-muted-foreground'>{me.user.email}</p></div> : <div className='mt-8 max-w-lg'>
                <div className='flex gap-2' role='tablist'><Button type='button' variant={authMode === 'login' ? 'default' : 'outline'} onClick={() => setAuthMode('login')}>Sign in</Button><Button type='button' variant={authMode === 'register' ? 'default' : 'outline'} onClick={() => setAuthMode('register')}>Create account</Button></div>
                <form className='mt-6 space-y-4' onSubmit={(event) => { event.preventDefault(); authenticate.mutate(); }}>
                  {authMode === 'register' ? <><div><label className='field-label' htmlFor='full-name'>Full name</label><Input id='full-name' className='mt-2' value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} /></div><div><label className='field-label' htmlFor='phone'>Phone (optional)</label><Input id='phone' className='mt-2' value={phone} onChange={(event) => setPhone(event.target.value)} /></div></> : null}
                  <div><label className='field-label' htmlFor='email'>Email</label><Input id='email' className='mt-2' type='email' value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
                  <div><label className='field-label' htmlFor='password'>Password</label><Input id='password' className='mt-2' type='password' value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /></div>
                  <Button type='submit' disabled={authenticate.isPending}>{authenticate.isPending ? 'Please wait…' : authMode === 'login' ? 'Sign in and continue' : 'Create account and continue'}</Button>
                  {authenticate.error ? <Alert variant='danger'>{authenticate.error.message}</Alert> : null}
                </form>
              </div>}
            </section>
          ) : null}

          {step === 4 ? (
            <section aria-labelledby='step-four-title'>
              <p className='kicker'>Step 4 of 4</p><h2 id='step-four-title' className='page-title mt-3'>Review and confirm.</h2>
              <dl className='mt-8 divide-y divide-border border-y border-border text-sm'>
                <div className='flex justify-between gap-4 py-4'><dt className='text-muted-foreground'>Service</dt><dd>{selectedService?.name}</dd></div><div className='flex justify-between gap-4 py-4'><dt className='text-muted-foreground'>Doctor</dt><dd>{selectedDoctor?.full_name}</dd></div><div className='flex justify-between gap-4 py-4'><dt className='text-muted-foreground'>Time</dt><dd>{draft.slotStart ? formatClinicTime(draft.slotStart) : ''}</dd></div>
              </dl>
              <div className='mt-7'><label className='field-label' htmlFor='reason'>Reason for visit</label><Textarea id='reason' className='mt-2' value={draft.reason} onChange={(event) => update('reason', event.target.value)} placeholder='Briefly describe what you would like to discuss.' rows={5} /></div>
              <label className='mt-5 flex items-start gap-3 text-sm leading-6'><input type='checkbox' className='mt-1 size-4 accent-[#18302B]' checked={draft.consent} onChange={(event) => update('consent', event.target.checked)} /><span>I confirm that the appointment details above are correct.</span></label>
              <div className='mt-6 flex items-center gap-3 text-xs text-muted-foreground'><ShieldCheck className='size-4' /> Your session is protected with an HttpOnly cookie and CSRF validation.</div>
              {booking.error && !(booking.error instanceof ApiClientError && booking.error.code === 'slot_unavailable') ? <Alert variant='danger' className='mt-5'>{booking.error.message}</Alert> : null}
            </section>
          ) : null}

          <div className='mt-10 flex items-center justify-between border-t border-border pt-6'>
            <Button type='button' variant='ghost' onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1}><ArrowLeft className='size-4' /> Back</Button>
            {step < 4 ? <Button type='button' onClick={next} disabled={step === 3 && !me && authenticate.isPending}>Continue <ArrowRight className='size-4' /></Button> : <Button type='button' onClick={() => booking.mutate()} disabled={!canContinueBooking(4, draft, true) || booking.isPending}>{booking.isPending ? 'Confirming…' : 'Confirm appointment'} <ArrowRight className='size-4' /></Button>}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return <Suspense fallback={<div className='container-max page-y text-sm text-muted-foreground'>Loading booking…</div>}><BookingWizard /></Suspense>;
}
