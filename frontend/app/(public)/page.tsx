'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, Clock3, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

const doctorImage = (slug: string) => slug.includes('farid') ? '/images/farid-khan.webp' : '/images/amelia-smith.webp';

export default function HomePage() {
  const services = useQuery({ queryKey: ['services'], queryFn: api.getServices });
  const doctors = useQuery({ queryKey: ['doctors'], queryFn: api.getDoctors });

  return (
    <div>
      <section className='container-max grid gap-12 py-12 sm:py-16 lg:grid-cols-[0.92fr,1.08fr] lg:items-center lg:py-20'>
        <div>
          <p className='kicker'>Calm care, clearly arranged</p>
          <h1 className='mt-5 max-w-xl font-display text-5xl leading-[1.05] tracking-[-0.035em] sm:text-6xl'>A simpler way to plan your next visit.</h1>
          <p className='mt-6 max-w-xl text-lg leading-8 text-muted-foreground'>Choose the right service, see real availability in Pacific Time, and manage every appointment from one clear patient portal.</p>
          <div className='mt-8 flex flex-wrap gap-3'>
            <Link href='/book'><Button size='lg'>Find an appointment <ArrowRight className='size-4' /></Button></Link>
            <Link href='/#doctors'><Button variant='outline' size='lg'>Meet the doctors</Button></Link>
          </div>
        </div>
        <figure>
          <div className='relative aspect-[4/3] overflow-hidden rounded-[2px] bg-muted'>
            <Image src='/images/clinic-interior.webp' alt='Warm, quiet clinic reception interior' fill priority sizes='(max-width: 1024px) 100vw, 55vw' className='object-cover' />
          </div>
          <figcaption className='mt-3 text-xs text-muted-foreground'>A calm space for focused, personal care.</figcaption>
        </figure>
      </section>

      <section id='services' className='section-rule'>
        <div className='container-max section-pad'>
          <div className='max-w-2xl'>
            <p className='kicker'>Services</p>
            <h2 className='mt-4 font-display text-4xl tracking-[-0.025em]'>Start with what you need.</h2>
            <p className='mt-4 leading-7 text-muted-foreground'>Each visit has a clear duration and price before you choose a time.</p>
          </div>
          {services.error ? <Alert variant='danger' className='mt-8'>We could not load services. <button className='underline' onClick={() => void services.refetch()}>Try again</button></Alert> : null}
          <div className='mt-10 divide-y divide-border border-y border-border' aria-busy={services.isLoading}>
            {(services.data ?? []).map((service) => (
              <article key={service.id} className='grid gap-4 py-7 md:grid-cols-[1fr,120px,120px,auto] md:items-center'>
                <div><h3 className='font-display text-2xl'>{service.name}</h3><p className='mt-2 max-w-2xl text-sm leading-6 text-muted-foreground'>{service.description}</p></div>
                <p className='flex items-center gap-2 text-sm'><Clock3 className='size-4 text-success' /> {service.duration_minutes} min</p>
                <p className='font-display text-xl'>${Number(service.price).toFixed(0)}</p>
                <Link href={`/book?service=${service.id}`}><Button variant='outline' size='sm'>Choose</Button></Link>
              </article>
            ))}
            {services.isLoading ? <p className='py-8 text-sm text-muted-foreground'>Loading services…</p> : null}
          </div>
        </div>
      </section>

      <section id='doctors' className='section-rule bg-[#EEE9DF]'>
        <div className='container-max section-pad'>
          <p className='kicker'>Your care team</p>
          <div className='mt-4 grid gap-5 md:grid-cols-2'>
            {(doctors.data ?? []).map((doctor) => (
              <article key={doctor.id} className='grid overflow-hidden border border-border bg-background sm:grid-cols-[190px,1fr]'>
                <div className='relative min-h-64'><Image src={doctorImage(doctor.slug)} alt={`${doctor.full_name}, ${doctor.specialty}`} fill sizes='190px' className='object-cover' /></div>
                <div className='p-6'>
                  <p className='text-xs font-bold uppercase tracking-[0.14em] text-success'>{doctor.specialty}</p>
                  <h3 className='mt-3 font-display text-2xl'>{doctor.full_name}</h3>
                  <p className='mt-3 text-sm leading-6 text-muted-foreground'>{doctor.bio}</p>
                  <p className='mt-4 text-sm'>{doctor.years_experience} years of experience</p>
                  <div className='mt-6 flex gap-2'><Link href={`/book?doctor=${doctor.id}`}><Button size='sm'>Book</Button></Link><Link href={`/doctors/${doctor.slug}`}><Button variant='outline' size='sm'>Profile</Button></Link></div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id='booking' className='section-rule'>
        <div className='container-max section-pad grid gap-10 lg:grid-cols-[0.7fr,1.3fr]'>
          <div><p className='kicker'>How booking works</p><h2 className='mt-4 font-display text-4xl'>Four decisions. One confirmed visit.</h2></div>
          <ol className='divide-y divide-border border-y border-border'>
            {['Choose a service and a doctor who provides it.', 'Pick an available clinic date and time in PT.', 'Sign in or create a patient account securely.', 'Review the details, add your reason, and confirm.'].map((text, index) => (
              <li key={text} className='grid grid-cols-[44px,1fr] gap-4 py-5'><span className='font-display text-2xl text-success'>0{index + 1}</span><p className='leading-7'>{text}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section id='contact' className='section-rule bg-primary text-primary-foreground'>
        <div className='container-max grid gap-8 py-14 md:grid-cols-[1fr,auto] md:items-end'>
          <div><p className='text-xs font-bold uppercase tracking-[0.18em] text-white/60'>San Francisco</p><h2 className='mt-4 font-display text-3xl'>Need help finding the right visit?</h2><p className='mt-3 max-w-xl text-sm leading-6 text-white/70'>Our team can help you choose a service, find a suitable time, or understand your next step.</p></div>
          <div className='space-y-2 text-sm'><p className='flex items-center gap-2'><MapPin className='size-4' /> 1200 Health Ave, San Francisco</p><p className='flex items-center gap-2'><CalendarDays className='size-4' /> Monday–Friday, Pacific Time</p></div>
        </div>
      </section>
    </div>
  );
}
