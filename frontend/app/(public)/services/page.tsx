'use client';

import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { ukServiceDescription, ukServiceName } from '@/lib/uk';

export default function ServicesPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['services'], queryFn: api.getServices });

  return (
    <div className='container-max page-y section-stack'>
      <PageHeader
        title='Послуги'
        subtitle='Оберіть тип візиту. Тривалість послуги одразу враховується під час підбору доступного часу.'
        action={
          <Link href='/book'>
            <Button>
              Записатись
              <ArrowRight className='size-4' />
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className='space-y-3'>
          {[...Array(3)].map((_, idx) => (
            <Skeleton key={idx} className='h-32 rounded-lg' />
          ))}
        </div>
      ) : error ? (
        <EmptyState title='Не вдалося завантажити послуги' description='Перевірте підключення до backend і спробуйте ще раз.' />
      ) : (
        <section className='divide-y divide-border/75 border-y border-border/75'>
          {data?.map((service, index) => (
            <article key={service.id} className='grid gap-5 py-7 lg:grid-cols-[72px,1fr,220px] lg:items-start'>
              <div className='font-mono text-sm text-muted-foreground'>{String(index + 1).padStart(2, '0')}</div>
              <div>
                <div className='flex flex-wrap items-center gap-3'>
                  <h2 className='font-display text-2xl font-semibold tracking-tight sm:text-3xl'>{ukServiceName(service)}</h2>
                  <Badge variant='outline'>
                    <Clock className='mr-1 size-3' />
                    {service.duration_minutes} хв
                  </Badge>
                </div>
                <p className='mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base'>{ukServiceDescription(service)}</p>
              </div>
              <div className='flex items-center justify-between gap-4 border-l-0 border-border/75 lg:block lg:border-l lg:pl-6'>
                <p className='font-display text-3xl font-semibold tracking-tight'>${service.price}</p>
                <Link href='/book' className='mt-0 block lg:mt-4'>
                  <Button variant='outline' size='sm'>
                    Обрати
                  </Button>
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}

      <section className='ink-panel grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr,0.7fr] lg:items-end'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.16em] text-white/55'>Розклад</p>
          <h2 className='mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl'>Кожна послуга має свою тривалість.</h2>
          <p className='mt-4 max-w-2xl text-sm leading-6 text-white/70'>
            Консультація на 30 хвилин і річний огляд на 60 хвилин не повинні займати однаковий слот. Система враховує
            тривалість ще до підтвердження запису.
          </p>
        </div>
        <Link href='/book'>
          <Button variant='secondary' size='lg'>
            Перевірити доступний час
            <ArrowRight className='size-4' />
          </Button>
        </Link>
      </section>
    </div>
  );
}
