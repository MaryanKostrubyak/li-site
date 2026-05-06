'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, BadgeDollarSign, CalendarDays, Stethoscope } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { ukDoctorBio, ukSpecialty } from '@/lib/uk';
import { Doctor } from '@/types/api';

function getDoctorImage(doctor: Doctor) {
  return doctor.specialty.toLowerCase().includes('cardiology')
    ? '/images/doctor-farid-khan.png'
    : '/images/doctor-amelia-smith.png';
}

export default function DoctorProfilePage() {
  const params = useParams<{ id: string }>();
  const doctorId = params.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: () => api.getDoctor(doctorId),
    enabled: Boolean(doctorId)
  });

  return (
    <div className='container-max page-y section-stack'>
      {isLoading ? (
        <Skeleton className='h-96 rounded-lg' />
      ) : error || !data ? (
        <EmptyState title='Профіль лікаря недоступний' description='Не вдалося завантажити цей профіль.' />
      ) : (
        <>
          <section className='grid gap-8 border-b border-border/75 pb-10 lg:grid-cols-[0.95fr,1.05fr] lg:items-end'>
            <div>
              <p className='kicker'>Профіль лікаря</p>
              <h1 className='page-title mt-4'>{data.full_name}</h1>
              <p className='page-subtitle'>{ukSpecialty(data)}. {data.years_experience} років клінічного досвіду.</p>
              <div className='mt-8 flex flex-wrap gap-3'>
                <Link href='/book'>
                  <Button size='lg'>
                    Записатись
                    <ArrowRight className='size-4' />
                  </Button>
                </Link>
                <Link href='/doctors'>
                  <Button variant='outline' size='lg'>
                    До списку лікарів
                  </Button>
                </Link>
              </div>
            </div>

            <div className='ink-panel grid overflow-hidden p-0 sm:grid-cols-[220px,1fr]'>
              <div className='relative min-h-80 sm:min-h-full'>
                <Image
                  src={getDoctorImage(data)}
                  alt={`${data.full_name}, ${ukSpecialty(data)}`}
                  fill
                  sizes='(max-width: 640px) 100vw, 220px'
                  className='object-cover'
                  priority
                />
                <div className='absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent sm:bg-gradient-to-r' />
              </div>
              <div className='p-6 sm:p-8'>
                <p className='text-sm uppercase tracking-[0.16em] text-white/50'>Фокус лікаря</p>
                <p className='mt-3 max-w-xl text-2xl font-semibold leading-snug'>{ukDoctorBio(data)}</p>
              </div>
            </div>
          </section>

          <section className='grid gap-8 lg:grid-cols-[1fr,0.75fr]'>
            <article className='soft-panel p-6 sm:p-8'>
              <div className='mb-8 flex items-center gap-3'>
                <Stethoscope className='size-5 text-primary' />
                <h2 className='panel-title'>Професійний профіль</h2>
              </div>
              <div className='grid gap-6 sm:grid-cols-2'>
                <div className='data-row sm:border-b-0 sm:border-r sm:pr-6'>
                  <p className='kicker'>Спеціальність</p>
                  <p className='mt-2 text-lg font-semibold'>{ukSpecialty(data)}</p>
                </div>
                <div className='data-row sm:border-b-0'>
                  <p className='kicker'>Досвід</p>
                  <p className='mt-2 text-lg font-semibold'>{data.years_experience} років</p>
                </div>
              </div>
              <p className='mt-8 max-w-3xl text-base leading-7 text-muted-foreground'>{ukDoctorBio(data)}</p>
            </article>

            <aside className='space-y-4'>
              <div className='soft-panel p-6'>
                <BadgeDollarSign className='size-5 text-accent' />
                <p className='mt-5 text-sm text-muted-foreground'>Вартість консультації</p>
                <p className='mt-1 font-display text-4xl font-semibold tracking-tight'>${data.consultation_fee}</p>
              </div>
              <div className='soft-panel p-6'>
                <CalendarDays className='size-5 text-primary' />
                <p className='mt-5 text-sm leading-6 text-muted-foreground'>
                  Доступний час перевіряється з урахуванням тривалості послуги та розкладу лікаря.
                </p>
                <Link href='/book' className='mt-5 block'>
                  <Button variant='outline' className='w-full'>
                    Знайти час
                  </Button>
                </Link>
              </div>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}
