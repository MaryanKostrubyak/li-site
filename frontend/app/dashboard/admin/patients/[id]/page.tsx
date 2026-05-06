'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, FileText, Plus, Tag, UserRound } from 'lucide-react';

import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Protected } from '@/components/shared/protected';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ukAppointmentReason, ukDateTime, ukFollowUpStatus, ukInternalNote, ukLeadSource, ukTag } from '@/lib/uk';

export default function AdminPatientDetailPage() {
  const { token } = useAuth();
  const params = useParams<{ id: string }>();
  const patientId = params.id;
  const queryClient = useQueryClient();

  const [tagText, setTagText] = useState('');
  const [noteText, setNoteText] = useState('');

  const detailQuery = useQuery({
    queryKey: ['admin-patient', token, patientId],
    queryFn: () => api.adminPatientDetail(token!, patientId),
    enabled: Boolean(token && patientId)
  });

  const tagMutation = useMutation({
    mutationFn: () => api.adminAddTag(token!, patientId, tagText),
    onSuccess: () => {
      setTagText('');
      queryClient.invalidateQueries({ queryKey: ['admin-patient', token, patientId] });
    }
  });

  const noteMutation = useMutation({
    mutationFn: () => api.adminAddNote(token!, patientId, noteText),
    onSuccess: () => {
      setNoteText('');
      queryClient.invalidateQueries({ queryKey: ['admin-patient', token, patientId] });
    }
  });

  const payload = detailQuery.data;

  return (
    <Protected role='admin'>
      <div className='section-stack'>
        <PageHeader
          title={payload?.patient.full_name ?? 'Профіль пацієнта'}
          subtitle='CRM-картка з контактами, тегами, внутрішніми нотатками та історією записів.'
          action={
            <Link href='/dashboard/admin#operations'>
              <Button variant='outline' size='sm'>
                <ArrowLeft className='size-4' />
                Назад до CRM
              </Button>
            </Link>
          }
        />

        {detailQuery.isLoading ? (
          <Skeleton className='h-52 w-full rounded-lg' />
        ) : payload ? (
          <section className='grid gap-6 xl:grid-cols-[0.8fr,1.2fr]'>
            <aside className='space-y-6'>
              <div className='ink-panel p-6'>
                <UserRound className='size-6 text-white/70' />
                <h2 className='mt-5 font-display text-3xl font-semibold tracking-tight'>{payload.patient.full_name}</h2>
                <p className='mt-2 text-sm text-white/58'>{payload.patient.email}</p>
                <div className='mt-5'>
                  <Badge className='border-white/15 bg-white/10 text-white'>{ukFollowUpStatus(payload.patient.follow_up_status)}</Badge>
                </div>
              </div>

              <div className='dashboard-panel p-5'>
                <p className='kicker'>Дані профілю</p>
                <div className='mt-4 space-y-4 text-sm'>
                  <div>
                    <p className='text-muted-foreground'>Телефон</p>
                    <p className='mt-1 font-semibold'>{payload.patient.phone ?? '-'}</p>
                  </div>
                  <div>
                    <p className='text-muted-foreground'>Джерело</p>
                    <p className='mt-1 font-semibold'>{ukLeadSource(payload.patient.lead_source)}</p>
                  </div>
                </div>
              </div>

              <div className='dashboard-panel p-5'>
                <div className='flex items-center gap-2'>
                  <Tag className='size-5 text-primary' />
                  <h2 className='panel-title'>Теги</h2>
                </div>
                <div className='mt-4 flex gap-2'>
                  <Input
                    value={tagText}
                    onChange={(event) => setTagText(event.target.value)}
                    placeholder='Наприклад: потрібен дзвінок'
                  />
                  <Button size='icon' onClick={() => tagMutation.mutate()} disabled={!tagText || tagMutation.isPending} aria-label='Додати тег'>
                    <Plus className='size-4' />
                  </Button>
                </div>
                {(payload.tags ?? []).length === 0 ? (
                  <div className='mt-4'>
                    <EmptyState title='Тегів ще немає' description='Теги допомагають швидко бачити пріоритети і групи пацієнтів.' />
                  </div>
                ) : (
                  <div className='mt-4 flex flex-wrap gap-2'>
                    {(payload.tags ?? []).map((tag: any) => (
                      <Badge key={tag.id} variant='outline'>
                        {ukTag(tag.tag)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </aside>

            <main className='space-y-6'>
              <section className='dashboard-panel p-5 sm:p-6'>
                <div className='flex items-center gap-2'>
                  <FileText className='size-5 text-primary' />
                  <h2 className='panel-title'>Внутрішні нотатки</h2>
                </div>
                <p className='mt-2 text-sm leading-6 text-muted-foreground'>Контекст для команди: побажання, обмеження, домовленості.</p>

                <div className='mt-5 grid gap-2 sm:grid-cols-[1fr,auto]'>
                  <Input
                    value={noteText}
                    onChange={(event) => setNoteText(event.target.value)}
                    placeholder='Додайте нотатку для команди'
                  />
                  <Button onClick={() => noteMutation.mutate()} disabled={!noteText || noteMutation.isPending}>
                    <Plus className='size-4' />
                    Зберегти
                  </Button>
                </div>

                {(payload.notes ?? []).length === 0 ? (
                  <div className='mt-5'>
                    <EmptyState title='Нотаток ще немає' description='Додайте важливу інформацію для рецепції або лікаря.' />
                  </div>
                ) : (
                  <div className='mt-5 divide-y divide-border/70 border-y border-border/70'>
                    {(payload.notes ?? []).map((note: any) => (
                      <article key={note.id} className='py-4 text-sm'>
                        <p className='leading-6'>{ukInternalNote(note.note)}</p>
                        <p className='mt-2 text-xs text-muted-foreground'>{ukDateTime(note.created_at)}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className='dashboard-panel p-5 sm:p-6'>
                <div className='flex items-center gap-2'>
                  <CalendarDays className='size-5 text-accent' />
                  <h2 className='panel-title'>Історія записів</h2>
                </div>
                <p className='mt-2 text-sm leading-6 text-muted-foreground'>Минулі та майбутні звернення пацієнта.</p>

                <div className='mt-5 divide-y divide-border/70 border-y border-border/70'>
                  {(payload.appointments ?? []).length === 0 ? (
                    <div className='py-5'>
                      <EmptyState title='Історії записів немає' description='Записи зʼявляться тут після першого бронювання.' />
                    </div>
                  ) : (
                    (payload.appointments ?? []).map((appointment: any) => (
                      <article key={appointment.id} className='grid gap-3 py-4 sm:grid-cols-[210px,1fr,auto] sm:items-start'>
                        <p className='text-sm font-semibold'>{ukDateTime(appointment.start_at)}</p>
                        <p className='text-sm leading-6 text-muted-foreground'>{ukAppointmentReason(appointment.reason)}</p>
                        <StatusBadge status={appointment.status} />
                      </article>
                    ))
                  )}
                </div>
              </section>
            </main>
          </section>
        ) : (
          <Alert variant='danger'>Не вдалося завантажити профіль пацієнта.</Alert>
        )}
      </div>
    </Protected>
  );
}
