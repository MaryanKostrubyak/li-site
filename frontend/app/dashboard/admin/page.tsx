'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, CalendarCheck, ExternalLink, Filter, Plus, UsersRound } from 'lucide-react';

import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Protected } from '@/components/shared/protected';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { appointmentStatusOptions, ukDateTime, ukLeadSource, ukServiceName, ukStatus } from '@/lib/uk';

const metricLabels: Record<string, string> = {
  total_patients: 'Усього пацієнтів',
  total_doctors: 'Лікарі',
  upcoming_appointments: 'Майбутні записи',
  completed_last_7_days: 'Завершено за 7 днів'
};

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [filterStatus, setFilterStatus] = useState('');
  const [manualForm, setManualForm] = useState({
    patient_id: '',
    doctor_id: '',
    service_id: '',
    start_at: '',
    reason: 'Ручний запис від рецепції',
    source_channel: 'manual'
  });

  const metricsQuery = useQuery({
    queryKey: ['admin-metrics', token],
    queryFn: () => api.adminMetrics(token!),
    enabled: Boolean(token)
  });

  const appointmentsQuery = useQuery({
    queryKey: ['admin-appointments', token],
    queryFn: () => api.adminAppointments(token!),
    enabled: Boolean(token)
  });

  const patientsQuery = useQuery({
    queryKey: ['admin-patients', token],
    queryFn: () => api.adminPatients(token!),
    enabled: Boolean(token)
  });

  const doctorsQuery = useQuery({ queryKey: ['doctors'], queryFn: api.getDoctors });
  const servicesQuery = useQuery({ queryKey: ['services'], queryFn: api.getServices });

  const filteredAppointments = useMemo(() => {
    const rows = appointmentsQuery.data ?? [];
    if (!filterStatus) {
      return rows;
    }
    return rows.filter((appointment) => appointment.status === filterStatus);
  }, [appointmentsQuery.data, filterStatus]);

  const canCreateManual = Boolean(
    manualForm.patient_id && manualForm.doctor_id && manualForm.service_id && manualForm.start_at && manualForm.reason.trim()
  );

  const updateStatusMutation = useMutation({
    mutationFn: (payload: { appointmentId: string; status: string }) =>
      api.adminUpdateAppointment(token!, payload.appointmentId, { status: payload.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-appointments', token] });
      queryClient.invalidateQueries({ queryKey: ['admin-metrics', token] });
    }
  });

  const createManualMutation = useMutation({
    mutationFn: () => api.adminCreateAppointment(token!, manualForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-appointments', token] });
      queryClient.invalidateQueries({ queryKey: ['admin-metrics', token] });
      setManualForm((prev) => ({ ...prev, start_at: '' }));
    }
  });

  const reminderMutation = useMutation({
    mutationFn: () => api.runReminders(token!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-metrics', token] })
  });

  return (
    <Protected role='admin'>
      <div className='section-stack'>
        <PageHeader
          title='CRM адміністратора'
          subtitle='Керуйте записами, статусами пацієнтів і швидкими діями рецепції в одному робочому просторі.'
          action={
            <Button variant='outline' size='sm' onClick={() => reminderMutation.mutate()}>
              <BellRing className='size-4' />
              Запустити нагадування
            </Button>
          }
        />

        <section className='dashboard-panel p-5 sm:p-6'>
          <div className='flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between'>
            <div>
              <p className='kicker'>Огляд клініки</p>
              <h2 className='mt-2 font-display text-3xl font-semibold tracking-normal'>Ключові показники на сьогодні</h2>
            </div>
            <Badge variant='outline'>{filteredAppointments.length} записів у списку</Badge>
          </div>

          <div className='mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            {metricsQuery.isLoading
              ? [...Array(4)].map((_, index) => <Skeleton key={index} className='h-24 rounded-lg' />)
              : Object.entries(metricsQuery.data ?? {}).map(([key, value]) => (
                  <div key={key} className='rounded-lg border border-border/75 bg-white/70 p-4'>
                    <p className='text-sm text-muted-foreground'>{metricLabels[key] ?? key.replaceAll('_', ' ')}</p>
                    <p className='mt-2 font-display text-4xl font-semibold tracking-normal'>{value}</p>
                  </div>
                ))}
          </div>
        </section>

        <section id='appointments' className='dashboard-panel overflow-hidden'>
          <div className='flex flex-col gap-4 border-b border-border/75 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6'>
            <div>
              <div className='flex items-center gap-2'>
                <CalendarCheck className='size-5 text-primary' />
                <h2 className='panel-title'>Записи</h2>
              </div>
              <p className='mt-2 text-sm leading-6 text-muted-foreground'>Статуси, час візиту і швидке оновлення для рецепції.</p>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <Filter className='size-4 text-muted-foreground' />
              <Select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className='w-44'>
                <option value=''>Усі статуси</option>
                {appointmentStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {ukStatus(status)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className='p-5 sm:p-6'>
            {appointmentsQuery.isLoading ? (
              <Skeleton className='h-72 w-full rounded-lg' />
            ) : filteredAppointments.length === 0 ? (
              <EmptyState
                title='Записів не знайдено'
                description='За поточним фільтром немає рядків. Спробуйте інший статус або створіть запис вручну.'
              />
            ) : (
              <>
              <div className='space-y-3 md:hidden'>
                {filteredAppointments.map((appointment) => (
                  <article key={appointment.id} className='rounded-lg border border-border/80 bg-white/75 p-4'>
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-semibold'>{appointment.patient.name}</p>
                        <p className='mt-1 truncate text-xs text-muted-foreground'>{appointment.patient.email}</p>
                      </div>
                      <StatusBadge status={appointment.status} />
                    </div>
                    <div className='mt-4 grid gap-3 text-sm'>
                      <div>
                        <p className='text-xs text-muted-foreground'>Лікар</p>
                        <p className='mt-1 font-medium'>{appointment.doctor.name}</p>
                      </div>
                      <div>
                        <p className='text-xs text-muted-foreground'>Послуга</p>
                        <p className='mt-1 font-medium'>{ukServiceName(appointment.service.name)}</p>
                      </div>
                      <div>
                        <p className='text-xs text-muted-foreground'>Початок</p>
                        <p className='mt-1 font-medium'>{ukDateTime(appointment.start_at)}</p>
                      </div>
                      <Select
                        defaultValue={appointment.status}
                        disabled={updateStatusMutation.isPending}
                        onChange={(event) =>
                          updateStatusMutation.mutate({ appointmentId: appointment.id, status: event.target.value })
                        }
                      >
                        {appointmentStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {ukStatus(status)}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </article>
                ))}
              </div>

              <div className='hidden overflow-x-auto rounded-lg border border-border/80 bg-white/70 md:block'>
                <Table>
                  <THead>
                    <TR>
                      <TH>Пацієнт</TH>
                      <TH>Лікар</TH>
                      <TH>Послуга</TH>
                      <TH>Початок</TH>
                      <TH>Статус</TH>
                      <TH>Змінити</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {filteredAppointments.map((appointment) => (
                      <TR key={appointment.id}>
                        <TD>
                          <p className='font-medium'>{appointment.patient.name}</p>
                          <p className='mt-1 text-xs text-muted-foreground'>{appointment.patient.email}</p>
                        </TD>
                        <TD>{appointment.doctor.name}</TD>
                        <TD>{ukServiceName(appointment.service.name)}</TD>
                        <TD>{ukDateTime(appointment.start_at)}</TD>
                        <TD>
                          <StatusBadge status={appointment.status} />
                        </TD>
                        <TD>
                          <Select
                            defaultValue={appointment.status}
                            disabled={updateStatusMutation.isPending}
                            onChange={(event) =>
                              updateStatusMutation.mutate({ appointmentId: appointment.id, status: event.target.value })
                            }
                            className='min-w-36'
                          >
                            {appointmentStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {ukStatus(status)}
                              </option>
                            ))}
                          </Select>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
              </>
            )}
          </div>
        </section>

        <section id='operations' className='grid gap-6 xl:grid-cols-[1.2fr,0.8fr]'>
          <div className='dashboard-panel p-5 sm:p-6'>
            <div className='flex items-center gap-2'>
              <Plus className='size-5 text-primary' />
              <h2 className='panel-title'>Ручний запис</h2>
            </div>
            <p className='mt-2 text-sm leading-6 text-muted-foreground'>Створіть запис для пацієнта, який звернувся телефоном або на рецепції.</p>

            <div className='mt-6 grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <label className='field-label'>Пацієнт</label>
                <Select
                  value={manualForm.patient_id}
                  onChange={(event) => setManualForm((prev) => ({ ...prev, patient_id: event.target.value }))}
                >
                  <option value=''>Оберіть пацієнта</option>
                  {patientsQuery.data?.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.full_name} ({patient.email})
                    </option>
                  ))}
                </Select>
              </div>

              <div className='space-y-2'>
                <label className='field-label'>Лікар</label>
                <Select
                  value={manualForm.doctor_id}
                  onChange={(event) => setManualForm((prev) => ({ ...prev, doctor_id: event.target.value }))}
                >
                  <option value=''>Оберіть лікаря</option>
                  {doctorsQuery.data?.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.full_name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className='space-y-2'>
                <label className='field-label'>Послуга</label>
                <Select
                  value={manualForm.service_id}
                  onChange={(event) => setManualForm((prev) => ({ ...prev, service_id: event.target.value }))}
                >
                  <option value=''>Оберіть послугу</option>
                  {servicesQuery.data?.map((service) => (
                    <option key={service.id} value={service.id}>
                      {ukServiceName(service)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className='space-y-2'>
                <label className='field-label'>Дата і час</label>
                <Input
                  type='datetime-local'
                  value={manualForm.start_at ? new Date(manualForm.start_at).toISOString().slice(0, 16) : ''}
                  onChange={(event) =>
                    setManualForm((prev) => ({
                      ...prev,
                      start_at: event.target.value ? new Date(event.target.value).toISOString() : ''
                    }))
                  }
                />
              </div>

              <div className='space-y-2 md:col-span-2'>
                <label className='field-label'>Причина візиту</label>
                <Input
                  value={manualForm.reason}
                  onChange={(event) => setManualForm((prev) => ({ ...prev, reason: event.target.value }))}
                />
              </div>

              <div className='md:col-span-2'>
                <Button onClick={() => createManualMutation.mutate()} disabled={!canCreateManual || createManualMutation.isPending}>
                  <Plus className='size-4' />
                  {createManualMutation.isPending ? 'Створюємо...' : 'Створити запис'}
                </Button>
              </div>

              {createManualMutation.error ? (
                <div className='md:col-span-2'>
                  <Alert variant='danger'>{(createManualMutation.error as Error).message}</Alert>
                </div>
              ) : null}
            </div>
          </div>

          <div className='dashboard-panel p-5 sm:p-6'>
            <div className='flex items-center gap-2'>
              <UsersRound className='size-5 text-primary' />
              <h2 className='panel-title'>CRM пацієнтів</h2>
            </div>
            <p className='mt-2 text-sm leading-6 text-muted-foreground'>Відкрийте картку пацієнта, щоб бачити теги, нотатки і історію записів.</p>

            <div className='mt-5 divide-y divide-border/70 border-y border-border/70'>
              {(patientsQuery.data ?? []).length === 0 ? (
                <div className='py-5'>
                  <EmptyState title='Пацієнтів ще немає' description='Після створення записів тут зʼявляться швидкі переходи до CRM-карток.' />
                </div>
              ) : (
                (patientsQuery.data ?? []).slice(0, 8).map((patient) => (
                  <div key={patient.id} className='flex items-center justify-between gap-3 py-4'>
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-semibold'>{patient.full_name}</p>
                      <p className='mt-1 truncate text-xs text-muted-foreground'>
                        {patient.email} | {ukLeadSource(patient.lead_source)}
                      </p>
                    </div>
                    <Link href={`/dashboard/admin/patients/${patient.id}`}>
                      <Button size='icon' variant='outline' aria-label={`Відкрити картку ${patient.full_name}`}>
                        <ExternalLink className='size-4' />
                      </Button>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </Protected>
  );
}
