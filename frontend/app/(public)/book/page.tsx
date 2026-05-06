'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Brain, CalendarDays, CheckCircle2, Clock, SendHorizontal, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { ukServiceName, ukSpecialty } from '@/lib/uk';

const bookingSchema = z.object({
  service_id: z.string().min(1, 'Оберіть послугу'),
  doctor_id: z.string().min(1, 'Оберіть лікаря'),
  date: z.string().min(1, 'Оберіть дату'),
  slot_start_at: z.string().min(1, 'Оберіть доступний час'),
  patient_full_name: z.string().min(2, 'Вкажіть повне імʼя'),
  patient_email: z.string().email('Вкажіть коректний email'),
  patient_phone: z.string().optional(),
  reason: z.string().min(8, 'Коротко опишіть причину візиту')
});

type BookingFormValues = z.infer<typeof bookingSchema>;
const defaultBookingDate = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');

export default function BookingPage() {
  const [successId, setSuccessId] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<{ summary: string; classification: string; source: string } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      date: defaultBookingDate
    }
  });
  const { setValue } = form;

  const selectedDoctor = useWatch({ control: form.control, name: 'doctor_id' });
  const selectedService = useWatch({ control: form.control, name: 'service_id' });
  const selectedDate = useWatch({ control: form.control, name: 'date' });
  const selectedSlot = useWatch({ control: form.control, name: 'slot_start_at' });
  const patientFullName = useWatch({ control: form.control, name: 'patient_full_name' });
  const patientEmail = useWatch({ control: form.control, name: 'patient_email' });
  const reason = useWatch({ control: form.control, name: 'reason' });

  const servicesQuery = useQuery({ queryKey: ['services'], queryFn: api.getServices });
  const doctorsQuery = useQuery({ queryKey: ['doctors'], queryFn: api.getDoctors });

  const slotsQuery = useQuery({
    queryKey: ['slots', selectedDoctor, selectedService, selectedDate],
    queryFn: () => api.getDoctorSlots(selectedDoctor, selectedService, selectedDate),
    enabled: Boolean(selectedDoctor && selectedService && selectedDate)
  });

  const slotOptions = useMemo(() => slotsQuery.data?.slots ?? [], [slotsQuery.data]);
  const hasSlotPrerequisites = Boolean(selectedDoctor && selectedService && selectedDate);

  useEffect(() => {
    setValue('slot_start_at', '');
  }, [selectedDoctor, selectedService, selectedDate, setValue]);

  const bookingMutation = useMutation({
    mutationFn: (values: BookingFormValues) =>
      api.publicBook({
        service_id: values.service_id,
        doctor_id: values.doctor_id,
        start_at: values.slot_start_at,
        reason: values.reason,
        patient_email: values.patient_email,
        patient_full_name: values.patient_full_name,
        patient_phone: values.patient_phone,
        source_channel: 'website'
      }),
    onSuccess: (appointment) => {
      setSuccessId(appointment.id);
      form.reset({ date: defaultBookingDate });
      setAiInsight(null);
      setAiError(null);
    }
  });

  const runAiAssist = async () => {
    if (!reason || reason.length < 8) {
      setAiError('Спочатку опишіть причину візиту.');
      return;
    }
    setAiError(null);
    try {
      const [summary, classification] = await Promise.all([
        api.aiSummarizeBooking(reason),
        api.aiClassifyRequest(reason)
      ]);
      setAiInsight({
        summary: summary.output,
        classification: classification.classification,
        source: `${summary.source}/${classification.source}`
      });
    } catch (error) {
      setAiError((error as Error).message || 'Зараз не вдалося запустити AI-підказку.');
    }
  };

  const selectedServiceLabel = servicesQuery.data?.find((item) => item.id === selectedService);
  const selectedDoctorLabel = doctorsQuery.data?.find((item) => item.id === selectedDoctor)?.full_name;

  const stepState = {
    basics: Boolean(selectedService && selectedDoctor),
    slot: Boolean(selectedDate && selectedSlot),
    patient: Boolean(patientFullName && patientEmail),
    reason: Boolean(reason && reason.length >= 8)
  };

  const progressSteps = [
    ['Послуга і лікар', stepState.basics],
    ['Дата і час', stepState.slot],
    ['Дані пацієнта', stepState.patient],
    ['Причина візиту', stepState.reason]
  ] as const;

  return (
    <div className='container-max page-y'>
      <div className='grid gap-10 lg:grid-cols-[300px,minmax(0,1fr)] lg:items-start'>
        <aside className='space-y-4 lg:sticky lg:top-28'>
          <div className='ink-panel p-5'>
            <p className='text-xs font-semibold uppercase tracking-[0.16em] text-white/55'>Онлайн-запис</p>
            <h1 className='mt-4 font-display text-4xl font-semibold leading-none tracking-tight'>Запис до лікаря.</h1>
            <p className='mt-4 text-sm leading-6 text-white/70'>
              Спочатку оберіть послугу, щоб система показала правильні доступні години.
            </p>
          </div>

          <div className='soft-panel p-5'>
            <p className='kicker'>Прогрес</p>
            <div className='mt-4 space-y-3'>
              {progressSteps.map(([label, done], index) => (
                <div key={label} className='flex items-center justify-between gap-3'>
                  <div className='flex min-w-0 items-center gap-3'>
                    <span className='grid size-7 place-items-center rounded-full bg-muted text-xs font-semibold'>
                      {index + 1}
                    </span>
                    <span className='truncate text-sm text-muted-foreground'>{label}</span>
                  </div>
                  {done ? <CheckCircle2 className='size-4 text-success' /> : <span className='size-2 rounded-full bg-border' />}
                </div>
              ))}
            </div>
          </div>

          <div className='soft-panel p-5 text-sm'>
            <p className='kicker'>Підсумок</p>
            <div className='mt-4 space-y-3'>
              <p><span className='text-muted-foreground'>Послуга:</span> {selectedServiceLabel ? ukServiceName(selectedServiceLabel) : '-'}</p>
              <p><span className='text-muted-foreground'>Лікар:</span> {selectedDoctorLabel ?? '-'}</p>
              <p><span className='text-muted-foreground'>Дата:</span> {selectedDate || '-'}</p>
              <p>
                <span className='text-muted-foreground'>Час:</span>{' '}
                {selectedSlot ? new Date(selectedSlot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
              </p>
            </div>
          </div>
        </aside>

        <main className='min-w-0 space-y-6'>
          <header className='border-b border-border/75 pb-7'>
            <Badge variant='info'>Запис без дублювання слотів</Badge>
            <h2 className='page-title mt-4'>Зрозуміла форма у 4 кроки.</h2>
            <p className='page-subtitle'>
              Заповніть послугу, лікаря, час, контакти і причину візиту. Після цього система створить запис.
            </p>
          </header>

          {successId && (
            <Alert variant='success'>
              Запис створено. Номер підтвердження: <strong>{successId}</strong>
            </Alert>
          )}

          <form className='space-y-5' onSubmit={form.handleSubmit((values) => bookingMutation.mutate(values))}>
            <section className='dashboard-panel p-5 sm:p-6'>
              <div className='grid gap-5 lg:grid-cols-[160px,1fr]'>
                <div>
                  <p className='kicker'>Крок 1</p>
                  <h3 className='panel-title mt-2'>Візит</h3>
                </div>
                <div className='grid gap-4 md:grid-cols-2'>
                  <div className='space-y-2'>
                    <label className='field-label'>Послуга</label>
                    <Select {...form.register('service_id')}>
                      <option value=''>Оберіть послугу</option>
                      {servicesQuery.data?.map((service) => (
                        <option key={service.id} value={service.id}>
                          {ukServiceName(service)} ({service.duration_minutes} хв)
                        </option>
                      ))}
                    </Select>
                    <p className='text-xs text-danger'>{form.formState.errors.service_id?.message}</p>
                  </div>
                  <div className='space-y-2'>
                    <label className='field-label'>Лікар</label>
                    <Select {...form.register('doctor_id')}>
                      <option value=''>Оберіть лікаря</option>
                      {doctorsQuery.data?.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.full_name} - {ukSpecialty(doctor)}
                        </option>
                      ))}
                    </Select>
                    <p className='text-xs text-danger'>{form.formState.errors.doctor_id?.message}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className='dashboard-panel p-5 sm:p-6'>
              <div className='grid gap-5 lg:grid-cols-[160px,1fr]'>
                <div>
                  <p className='kicker'>Крок 2</p>
                  <h3 className='panel-title mt-2'>Час</h3>
                </div>
                <div className='space-y-5'>
                  <div className='max-w-xs space-y-2'>
                    <label className='field-label'>Дата</label>
                    <Input type='date' {...form.register('date')} />
                    <p className='text-xs text-danger'>{form.formState.errors.date?.message}</p>
                  </div>

                  <div className='space-y-3'>
                    <div className='flex items-center gap-2'>
                      <Clock className='size-4 text-primary' />
                      <p className='field-label'>Доступний час</p>
                    </div>
                    {!hasSlotPrerequisites ? (
                      <div className='rounded-lg border border-dashed border-border/80 bg-white/55 p-5'>
                        <p className='font-display text-xl font-semibold tracking-normal'>Спочатку оберіть візит</p>
                        <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                          Після вибору послуги, лікаря і дати тут зʼявляться доступні години.
                        </p>
                      </div>
                    ) : slotsQuery.isFetching ? (
                      <p className='text-sm text-muted-foreground'>Завантажуємо доступні години...</p>
                    ) : slotOptions.length > 0 ? (
                      <div className='grid gap-2 sm:grid-cols-3 xl:grid-cols-4'>
                        {slotOptions.map((slot) => {
                          const isActive = selectedSlot === slot.start_at;
                          return (
                            <Button
                              key={slot.start_at}
                              type='button'
                              variant={isActive ? 'default' : 'outline'}
                              className='justify-center'
                              onClick={() => form.setValue('slot_start_at', slot.start_at, { shouldValidate: true })}
                            >
                              {new Date(slot.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className='rounded-lg border border-dashed border-border/80 bg-white/55 p-5'>
                        <p className='font-display text-xl font-semibold tracking-tight'>Немає доступного часу</p>
                        <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                          Спробуйте іншу дату, лікаря або послугу.
                        </p>
                      </div>
                    )}
                    <p className='text-xs text-danger'>{form.formState.errors.slot_start_at?.message}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className='dashboard-panel p-5 sm:p-6'>
              <div className='grid gap-5 lg:grid-cols-[160px,1fr]'>
                <div>
                  <p className='kicker'>Крок 3</p>
                  <h3 className='panel-title mt-2'>Пацієнт</h3>
                </div>
                <div className='grid gap-4 md:grid-cols-2'>
                  <div className='space-y-2'>
                    <label className='field-label'>Повне імʼя</label>
                    <Input placeholder='Імʼя та прізвище' {...form.register('patient_full_name')} />
                    <p className='text-xs text-danger'>{form.formState.errors.patient_full_name?.message}</p>
                  </div>
                  <div className='space-y-2'>
                    <label className='field-label'>Email</label>
                    <Input type='email' placeholder='name@example.com' {...form.register('patient_email')} />
                    <p className='text-xs text-danger'>{form.formState.errors.patient_email?.message}</p>
                  </div>
                  <div className='space-y-2 md:col-span-2'>
                    <label className='field-label'>Телефон (необовʼязково)</label>
                    <Input placeholder='+1...' {...form.register('patient_phone')} />
                  </div>
                </div>
              </div>
            </section>

            <section className='dashboard-panel p-5 sm:p-6'>
              <div className='grid gap-5 lg:grid-cols-[160px,1fr]'>
                <div>
                  <p className='kicker'>Крок 4</p>
                  <h3 className='panel-title mt-2'>Причина</h3>
                </div>
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <label className='field-label'>Причина візиту</label>
                    <Textarea
                      placeholder='Опишіть симптоми, контекст повторного візиту або мету консультації.'
                      {...form.register('reason')}
                    />
                    <p className='text-xs text-danger'>{form.formState.errors.reason?.message}</p>
                  </div>

                  <div className='flex flex-wrap gap-2'>
                    <Button type='button' variant='outline' onClick={runAiAssist}>
                      <Brain className='size-4' />
                      Проаналізувати
                    </Button>
                    <Button type='submit' disabled={bookingMutation.isPending}>
                      <SendHorizontal className='size-4' />
                      {bookingMutation.isPending ? 'Записуємо...' : 'Підтвердити запис'}
                    </Button>
                  </div>

                  {bookingMutation.error ? <Alert variant='danger'>{(bookingMutation.error as Error).message}</Alert> : null}
                </div>
              </div>
            </section>
          </form>

          <section className='grid gap-4 lg:grid-cols-[0.9fr,1.1fr]'>
            <div className='soft-panel p-5 sm:p-6'>
              <ShieldCheck className='size-5 text-primary' />
                <h3 className='mt-4 panel-title'>Що перевіряється</h3>
              <p className='mt-3 text-sm leading-6 text-muted-foreground'>
                Перед збереженням система перевіряє лікаря, тривалість послуги, час початку і можливі конфлікти в
                розкладі.
              </p>
            </div>

            <div className='soft-panel p-5 sm:p-6'>
              <div className='flex items-center gap-2'>
                <CalendarDays className='size-5 text-accent' />
                <h3 className='panel-title'>AI-підказка</h3>
              </div>
              <div className='mt-4 space-y-3 text-sm'>
                {!aiInsight && !aiError ? (
                  <p className='text-muted-foreground'>Натисніть “Проаналізувати” після опису причини візиту.</p>
                ) : null}

                {aiError ? <Alert variant='warning'>{aiError}</Alert> : null}

                {aiInsight ? (
                  <>
                    <div>
                      <p className='kicker'>Короткий зміст</p>
                      <p className='mt-1 leading-6'>{aiInsight.summary}</p>
                    </div>
                    <div>
                      <p className='kicker'>Класифікація</p>
                      <p className='mt-1 leading-6'>{aiInsight.classification}</p>
                    </div>
                    <p className='fine-print'>Джерело: {aiInsight.source}</p>
                  </>
                ) : null}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
