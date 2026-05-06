import Link from 'next/link';
import { ArrowRight, Mail, MapPin, Phone } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';

const contactRows = [
  { icon: Mail, label: 'Email', value: 'hello@aetherclinic.demo' },
  { icon: Phone, label: 'Телефон', value: '+1 (202) 555-0133' },
  { icon: MapPin, label: 'Адреса', value: '1200 Health Ave, офіс 300, San Francisco, CA' }
];

export default function ContactPage() {
  return (
    <div className='container-max page-y section-stack'>
      <PageHeader
        title='Контакти'
        subtitle='Канали звʼязку для запису, підтримки пацієнтів і планової координації.'
        action={
          <Link href='/book'>
            <Button>
              Записатись онлайн
              <ArrowRight className='size-4' />
            </Button>
          </Link>
        }
      />

      <section className='grid gap-8 lg:grid-cols-[0.9fr,1.1fr]'>
        <div className='ink-panel p-6 sm:p-8'>
          <p className='text-xs font-semibold uppercase tracking-[0.16em] text-white/55'>Aether Clinic</p>
          <h2 className='mt-4 font-display text-4xl font-semibold tracking-tight'>Планова допомога без зайвої плутанини.</h2>
          <p className='mt-5 text-sm leading-6 text-white/70'>
            Онлайн-запис призначений для консультацій, повторних візитів, щорічних оглядів і підтримки пацієнтів. Для
            невідкладних станів звертайтесь до місцевих служб екстреної допомоги.
          </p>
        </div>

        <div className='divide-y divide-border/75 border-y border-border/75'>
          {contactRows.map((row) => {
            const Icon = row.icon;
            return (
              <div key={row.label} className='grid gap-4 py-6 sm:grid-cols-[48px,120px,1fr] sm:items-start'>
                <div className='grid size-12 place-items-center rounded-md bg-primary/10 text-primary'>
                  <Icon className='size-5' />
                </div>
                <p className='kicker pt-1'>{row.label}</p>
                <p className='text-base font-semibold leading-7'>{row.value}</p>
              </div>
            );
          })}

          <div className='grid gap-4 py-6 sm:grid-cols-[48px,120px,1fr]'>
            <div className='hidden sm:block' />
            <p className='kicker'>Графік</p>
            <div className='text-sm leading-6 text-muted-foreground'>
              <p className='font-semibold text-foreground'>Пн-Пт, 08:00-19:00</p>
              <p className='mt-2'>Координація клініки та підтримка онлайн-запису доступні в робочі години.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
