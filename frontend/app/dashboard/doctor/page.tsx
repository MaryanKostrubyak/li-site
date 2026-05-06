'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, ClipboardEdit, MessageSquareText, Stethoscope } from 'lucide-react';

import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Protected } from '@/components/shared/protected';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { appointmentStatusOptions, ukAppointmentReason, ukDateTime, ukStatus, ukWeekday } from '@/lib/uk';

export default function DoctorDashboardPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [rawNote, setRawNote] = useState('');
  const [followUpTemplate, setFollowUpTemplate] = useState('');

  const todayQuery = useQuery({
    queryKey: ['doctor-today', token],
    queryFn: () => api.doctorToday(token!),
    enabled: Boolean(token)
  });

  const upcomingQuery = useQuery({
    queryKey: ['doctor-upcoming', token],
    queryFn: () => api.doctorUpcoming(token!),
    enabled: Boolean(token)
  });

  const scheduleQuery = useQuery({
    queryKey: ['doctor-schedule', token],
    queryFn: () => api.doctorSchedule(token!),
    enabled: Boolean(token)
  });

  const updateStatusMutation = useMutation({
    mutationFn: (payload: { appointmentId: string; status: string }) =>
      api.doctorUpdateStatus(token!, payload.appointmentId, payload.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-today', token] });
      queryClient.invalidateQueries({ queryKey: ['doctor-upcoming', token] });
    }
  });

  const addNoteMutation = useMutation({
    mutationFn: () =>
      api.doctorAddNote(token!, selectedAppointmentId, {
        raw_note: rawNote,
        use_ai_formatting: true
      }),
    onSuccess: () => {
      setRawNote('');
      setFollowUpTemplate('');
    }
  });

  const followUpMutation = useMutation({
    mutationFn: () => api.aiFollowUp(rawNote),
    onSuccess: (result) => setFollowUpTemplate(result.output)
  });

  return (
    <Protected role='doctor'>
      <div className='section-stack'>
        <PageHeader
          title='Кабінет лікаря'
          subtitle='Сьогоднішні візити, найближчий розклад і нотатки після консультації без зайвих переходів.'
        />

        <section className='grid gap-6 xl:grid-cols-[1.2fr,0.8fr]'>
          <div className='dashboard-panel p-5 sm:p-6'>
            <div className='flex items-center gap-2'>
              <Stethoscope className='size-5 text-primary' />
              <h2 className='panel-title'>Черга на сьогодні</h2>
            </div>
            <p className='mt-2 text-sm leading-6 text-muted-foreground'>Оновлюйте статуси під час прийому, щоб команда бачила актуальний стан.</p>

            <div className='mt-5 divide-y divide-border/70 border-y border-border/70'>
              {todayQuery.isLoading ? (
                <div className='py-5'>
                  <Skeleton className='h-40 w-full rounded-lg' />
                </div>
              ) : (todayQuery.data ?? []).length === 0 ? (
                <div className='py-5'>
                  <EmptyState title='На сьогодні записів немає' description='Найближчі майбутні візити доступні нижче.' />
                </div>
              ) : (
                (todayQuery.data ?? []).map((appointment) => (
                  <article key={appointment.id} className='grid gap-4 py-5 lg:grid-cols-[88px,1fr,160px] lg:items-start'>
                    <div>
                      <p className='font-mono text-lg font-semibold'>
                        {new Date(appointment.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div className='mt-2'>
                        <StatusBadge status={appointment.status} />
                      </div>
                    </div>
                    <p className='text-sm leading-6 text-muted-foreground'>{ukAppointmentReason(appointment.reason)}</p>
                    <Select
                      defaultValue={appointment.status}
                      disabled={updateStatusMutation.isPending}
                      onChange={(event) => updateStatusMutation.mutate({ appointmentId: appointment.id, status: event.target.value })}
                    >
                      {appointmentStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {ukStatus(status)}
                        </option>
                      ))}
                    </Select>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className='dashboard-panel p-5 sm:p-6'>
            <div className='flex items-center gap-2'>
              <CalendarDays className='size-5 text-primary' />
              <h2 className='panel-title'>Робочий графік</h2>
            </div>
            <p className='mt-2 text-sm leading-6 text-muted-foreground'>Тижневі вікна доступності для онлайн-запису.</p>

            <div className='mt-5 space-y-3 text-sm'>
              {scheduleQuery.isLoading ? (
                <Skeleton className='h-40 w-full rounded-lg' />
              ) : (
                (scheduleQuery.data ?? []).map((slot) => (
                  <div key={slot.id} className='grid grid-cols-[90px,1fr] gap-4 border-b border-border/70 pb-3 last:border-0'>
                    <p className='font-semibold'>{ukWeekday(slot.weekday)}</p>
                    <div>
                      <p className='text-foreground'>{slot.start_time} - {slot.end_time}</p>
                      <p className='mt-1 text-xs text-muted-foreground'>Інтервал: {slot.slot_interval_minutes} хв</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className='grid gap-6 xl:grid-cols-[0.85fr,1.15fr]'>
          <div className='dashboard-panel p-5 sm:p-6'>
            <div className='flex items-center gap-2'>
              <CalendarDays className='size-5 text-accent' />
              <h2 className='panel-title'>Майбутні візити</h2>
            </div>
            <div className='mt-5 divide-y divide-border/70 border-y border-border/70'>
              {(upcomingQuery.data ?? []).slice(0, 10).length === 0 ? (
                <div className='py-5'>
                  <EmptyState title='Майбутніх візитів немає' description='Нові записи зʼявляться тут після підтвердження.' />
                </div>
              ) : (
                (upcomingQuery.data ?? []).slice(0, 10).map((appointment) => (
                  <article key={appointment.id} className='py-4'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <p className='text-sm font-semibold'>{ukDateTime(appointment.start_at)}</p>
                      <StatusBadge status={appointment.status} />
                    </div>
                    <p className='mt-2 text-sm leading-6 text-muted-foreground'>{ukAppointmentReason(appointment.reason)}</p>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className='dashboard-panel p-5 sm:p-6'>
            <div className='flex items-center gap-2'>
              <ClipboardEdit className='size-5 text-primary' />
              <h2 className='panel-title'>Нотатки і follow-up</h2>
            </div>
            <p className='mt-2 text-sm leading-6 text-muted-foreground'>Збережіть нотатку після прийому або підготуйте текст для пацієнта.</p>

            <div className='mt-5 space-y-4'>
              <Select value={selectedAppointmentId} onChange={(event) => setSelectedAppointmentId(event.target.value)}>
                <option value=''>Оберіть запис</option>
                {(todayQuery.data ?? []).concat(upcomingQuery.data ?? []).map((appointment) => (
                  <option key={appointment.id} value={appointment.id}>
                    {ukDateTime(appointment.start_at)} - {ukStatus(appointment.status)}
                  </option>
                ))}
              </Select>

              <Textarea
                value={rawNote}
                onChange={(event) => setRawNote(event.target.value)}
                placeholder='Коротко запишіть висновки прийому. Під час збереження нотатку буде структуровано.'
              />

              <div className='flex flex-wrap gap-2'>
                <Button onClick={() => addNoteMutation.mutate()} disabled={!selectedAppointmentId || !rawNote}>
                  <ClipboardEdit className='size-4' />
                  Зберегти нотатку
                </Button>
                <Button variant='outline' onClick={() => followUpMutation.mutate()} disabled={!rawNote}>
                  <MessageSquareText className='size-4' />
                  Створити follow-up
                </Button>
              </div>

              {addNoteMutation.error ? <Alert variant='danger'>{(addNoteMutation.error as Error).message}</Alert> : null}

              {followUpTemplate ? (
                <Alert variant='info'>
                  <p className='kicker'>Підготовлений follow-up</p>
                  <p className='mt-1'>{followUpTemplate}</p>
                </Alert>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </Protected>
  );
}
