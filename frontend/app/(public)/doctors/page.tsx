'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CircleCheck, Stethoscope } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
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

export default function DoctorsPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['doctors'], queryFn: api.getDoctors });

  return (
    <div className='container-max page-y section-stack'>
      <PageHeader
        title='Лікарі'
        subtitle='Профілі спеціалістів, досвід, вартість консультації та швидкий перехід до онлайн-запису.'
      />

      {isLoading ? (
        <div className='grid gap-4 lg:grid-cols-2'>
          {[...Array(4)].map((_, idx) => (
            <Skeleton key={idx} className='h-56 rounded-lg' />
          ))}
        </div>
      ) : error ? (
        <EmptyState title='Не вдалося завантажити лікарів' description='Спробуйте ще раз за кілька секунд.' />
      ) : (
        <section className='grid gap-5 lg:grid-cols-2'>
          {data?.map((doctor, index) => (
            <article key={doctor.id} className='soft-panel overflow-hidden'>
              <div className='grid min-h-full gap-0 sm:grid-cols-[190px,1fr]'>
                <div className='relative min-h-72 overflow-hidden border-b border-border/75 bg-muted/45 sm:border-b-0 sm:border-r'>
                  <Image
                    src={getDoctorImage(doctor)}
                    alt={`${doctor.full_name}, ${ukSpecialty(doctor)}`}
                    fill
                    sizes='(max-width: 640px) 100vw, 190px'
                    className='object-cover'
                    priority={index < 2}
                  />
                  <div className='absolute inset-0 bg-gradient-to-t from-ink/42 via-transparent to-transparent' />
                  <Badge
                    variant={doctor.is_accepting_new_patients ? 'success' : 'outline'}
                    className='absolute bottom-4 left-4 bg-white/90'
                  >
                    <CircleCheck className='mr-1 size-3' />
                    приймає
                  </Badge>
                </div>

                <div className='p-5 sm:p-6'>
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div>
                      <p className='kicker'>Лікар</p>
                      <h2 className='mt-2 font-display text-2xl font-semibold tracking-tight'>{doctor.full_name}</h2>
                    </div>
                    <Stethoscope className='size-5 text-primary' />
                  </div>
                  <p className='mt-3 text-sm font-semibold text-primary'>
                    {ukSpecialty(doctor)} | {doctor.years_experience} років досвіду
                  </p>
                  <p className='mt-3 text-sm leading-6 text-muted-foreground'>{ukDoctorBio(doctor)}</p>
                  <div className='mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4'>
                    <p className='text-sm'>
                      <span className='text-muted-foreground'>Консультація</span>{' '}
                      <span className='font-semibold'>${doctor.consultation_fee}</span>
                    </p>
                    <Link href={`/doctors/${doctor.id}`}>
                      <Button size='sm' variant='outline'>
                        Профіль
                        <ArrowRight className='size-4' />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
