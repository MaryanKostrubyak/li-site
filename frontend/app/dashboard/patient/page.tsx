'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CalendarClock, History, Mail } from 'lucide-react';

import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Protected } from '@/components/shared/protected';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { followUpLabels, ukAppointmentReason, ukAppointmentSummary, ukDateTime } from '@/lib/uk';

export default function PatientDashboardPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [rescheduleTarget, setRescheduleTarget] = useState<{ id: string; datetime: string } | null>(null);

  const upcomingQuery = useQuery({
    queryKey: ['patient-upcoming', token],
    queryFn: () => api.patientUpcoming(token!),
    enabled: Boolean(token)
  });

  const historyQuery = useQuery({
    queryKey: ['patient-history', token],
    queryFn: () => api.patientHistory(token!),
    enabled: Boolean(token)
  });

  const profileQuery = useQuery({
    queryKey: ['patient-profile', token],
    queryFn: () => api.patientProfile(token!),
    enabled: Boolean(token)
  });

  const cancelMutation = useMutation({
    mutationFn: (appointmentId: string) => api.cancelAppointment(token!, appointmentId, 'Canceled by patient portal'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-upcoming', token] });
      queryClient.invalidateQueries({ queryKey: ['patient-history', token] });
    }
  });

  const rescheduleMutation = useMutation({
    mutationFn: () => api.rescheduleAppointment(token!, rescheduleTarget!.id, new Date(rescheduleTarget!.datetime).toISOString()),
    onSuccess: () => {
      setRescheduleTarget(null);
      queryClient.invalidateQueries({ queryKey: ['patient-upcoming', token] });
    }
  });

  const profileMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.updatePatientProfile(token!, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patient-profile', token] })
  });

  return (
    <Protected role='patient'>
      <div className='section-stack'>
        <PageHeader
          title='Кабінет пацієнта'
          subtitle='Керуйте майбутніми візитами, переглядайте історію і налаштовуйте повідомлення.'
        />

        <section className='grid gap-6 xl:grid-cols-[1.25fr,0.75fr]'>
          <div className='dashboard-panel p-5 sm:p-6'>
            <div className='flex items-center gap-2'>
              <CalendarClock className='size-5 text-primary' />
              <h2 className='panel-title'>Майбутні записи</h2>
            </div>
            <p className='mt-2 text-sm leading-6 text-muted-foreground'>Скасуйте запис або оберіть новий час без дзвінка в клініку.</p>

            <div className='mt-5 divide-y divide-border/70 border-y border-border/70'>
              {(upcomingQuery.data ?? []).length === 0 ? (
                <div className='py-5'>
                  <EmptyState title='Майбутніх записів немає' description='Після підтвердження запис зʼявиться тут разом із доступними діями.' />
                </div>
              ) : (
                (upcomingQuery.data ?? []).map((appointment) => (
                  <article key={appointment.id} className='py-5'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <p className='text-sm font-semibold'>{ukDateTime(appointment.start_at)}</p>
                      <StatusBadge status={appointment.status} />
                    </div>
                    <p className='mt-2 text-sm leading-6 text-muted-foreground'>{ukAppointmentReason(appointment.reason)}</p>
                    <p className='mt-2 text-xs leading-5 text-muted-foreground'>
                      Короткий зміст: {ukAppointmentSummary(appointment.issue_summary)}
                    </p>
                    <div className='mt-4 flex flex-wrap gap-2'>
                      <Button variant='outline' size='sm' onClick={() => cancelMutation.mutate(appointment.id)}>
                        Скасувати
                      </Button>
                      <Button variant='outline' size='sm' onClick={() => setRescheduleTarget({ id: appointment.id, datetime: '' })}>
                        Змінити час
                      </Button>
                    </div>
                  </article>
                ))
              )}
            </div>

            {rescheduleTarget ? (
              <Alert variant='warning' className='mt-5'>
                <p className='font-semibold'>Змінити час запису</p>
                <div className='mt-3 grid gap-2 sm:grid-cols-[1fr,auto,auto]'>
                  <Input
                    type='datetime-local'
                    onChange={(event) =>
                      setRescheduleTarget((prev) => (prev ? { ...prev, datetime: event.target.value } : null))
                    }
                  />
                  <Button
                    size='sm'
                    onClick={() => rescheduleMutation.mutate()}
                    disabled={!rescheduleTarget.datetime || rescheduleMutation.isPending}
                  >
                    Підтвердити
                  </Button>
                  <Button size='sm' variant='ghost' onClick={() => setRescheduleTarget(null)}>
                    Закрити
                  </Button>
                </div>
              </Alert>
            ) : null}
          </div>

          <div className='dashboard-panel p-5 sm:p-6'>
            <div className='flex items-center gap-2'>
              <Bell className='size-5 text-primary' />
              <h2 className='panel-title'>Профіль і повідомлення</h2>
            </div>
            <p className='mt-2 text-sm leading-6 text-muted-foreground'>Оновіть статус follow-up і спосіб отримання нагадувань.</p>

            <div className='mt-5 space-y-5 text-sm'>
              <div className='space-y-2'>
                <label className='field-label'>Статус follow-up</label>
                <Select
                  value={profileQuery.data?.follow_up_status ?? 'none'}
                  onChange={(event) => profileMutation.mutate({ follow_up_status: event.target.value })}
                >
                  {Object.entries(followUpLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className='flex items-center justify-between gap-3 rounded-lg border border-border/75 bg-white/65 p-3'>
                <span className='text-sm text-muted-foreground'>Email-нагадування</span>
                <Badge variant={profileQuery.data?.notification_email_enabled ? 'success' : 'outline'}>
                  {profileQuery.data?.notification_email_enabled ? 'Увімкнено' : 'Вимкнено'}
                </Badge>
              </div>

              <div className='grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => profileMutation.mutate({ notification_email_enabled: true })}
                >
                  <Mail className='size-4' />
                  Увімкнути email
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => profileMutation.mutate({ notification_email_enabled: false })}
                >
                  Вимкнути email
                </Button>
              </div>

              <div className='space-y-2'>
                <label className='field-label'>ID чату Telegram</label>
                <Input
                  defaultValue={profileQuery.data?.telegram_chat_id ?? ''}
                  placeholder='Необовʼязково'
                  onBlur={(event) =>
                    profileMutation.mutate({
                      telegram_chat_id: event.target.value || null,
                      notification_telegram_enabled: Boolean(event.target.value)
                    })
                  }
                />
              </div>
            </div>
          </div>
        </section>

        <section className='dashboard-panel p-5 sm:p-6'>
          <div className='flex items-center gap-2'>
            <History className='size-5 text-accent' />
            <h2 className='panel-title'>Історія записів</h2>
          </div>
          <div className='mt-5 divide-y divide-border/70 border-y border-border/70'>
            {(historyQuery.data ?? []).length === 0 ? (
              <div className='py-5'>
                <EmptyState title='Історії ще немає' description='Завершені або скасовані записи зʼявляться в цьому списку.' />
              </div>
            ) : (
              (historyQuery.data ?? []).map((appointment) => (
                <article key={appointment.id} className='grid gap-3 py-4 sm:grid-cols-[220px,1fr,auto] sm:items-start'>
                  <p className='text-sm font-semibold'>{ukDateTime(appointment.start_at)}</p>
                  <p className='text-sm leading-6 text-muted-foreground'>{ukAppointmentReason(appointment.reason)}</p>
                  <StatusBadge status={appointment.status} />
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </Protected>
  );
}
