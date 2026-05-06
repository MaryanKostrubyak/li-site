import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  HeartPulse,
  LogIn,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Stethoscope,
  UserRound
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const services = [
  {
    name: 'Загальна консультація',
    description: 'Консультація для симптомів, профілактики та базового плану лікування.',
    duration: '30 хв',
    price: '$79'
  },
  {
    name: 'Повторний кардіологічний візит',
    description: 'Повторний візит для тиску, аналізів і корекції плану лікування.',
    duration: '45 хв',
    price: '$129'
  },
  {
    name: 'Річний профілактичний огляд',
    description: 'Річний огляд, профілактика та персональний план здоров’я.',
    duration: '60 хв',
    price: '$199'
  }
];

const doctors = [
  {
    name: 'Dr. Amelia Smith',
    specialty: 'Сімейна медицина',
    image: '/images/doctor-amelia-smith.png',
    href: '/doctors'
  },
  {
    name: 'Dr. Farid Khan',
    specialty: 'Кардіологія',
    image: '/images/doctor-farid-khan.png',
    href: '/doctors'
  }
];

const cabinetItems = [
  { title: 'Пацієнт', text: 'Візити та нагадування', icon: UserRound },
  { title: 'Лікар', text: 'Денний розклад', icon: Stethoscope },
  { title: 'Адмін', text: 'Записи та CRM', icon: CalendarCheck }
];

const contactItems = [
  { icon: Mail, text: 'hello@aetherclinic.demo' },
  { icon: Phone, text: '+1 (202) 555-0133' },
  { icon: MapPin, text: '1200 Health Ave, офіс 300, San Francisco, CA' }
];

const steps = [
  {
    title: 'Оберіть послугу',
    text: 'Виберіть тип візиту, щоб система показала правильну тривалість і доступні слоти.'
  },
  {
    title: 'Виберіть лікаря і час',
    text: 'Доступні години перевіряються автоматично, без подвійних записів.'
  },
  {
    title: 'Підтвердіть запис',
    text: 'Залиште контакти і коротко опишіть причину візиту.'
  }
];

export default function HomePage() {
  return (
    <div>
      <section className='container-max grid gap-10 py-12 sm:py-16 lg:grid-cols-[0.9fr,1.1fr] lg:items-center lg:py-20'>
        <div>
          <Badge variant='info'>Онлайн-запис до клініки</Badge>
          <h1 className='mt-5 font-display text-5xl font-semibold leading-none tracking-tight text-foreground sm:text-6xl'>
            Запишіться до лікаря без дзвінків і плутанини.
          </h1>
          <p className='mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg'>
            Оберіть послугу, лікаря і зручний час. Після запису можна керувати візитами в особистому кабінеті.
          </p>

          <div className='mt-8 grid gap-3 sm:grid-cols-[auto,auto] sm:justify-start'>
            <Link href='/book'>
              <Button size='lg' className='w-full sm:w-auto'>
                Записатись онлайн
                <ArrowRight className='size-4' />
              </Button>
            </Link>
            <Link href='/login'>
              <Button variant='outline' size='lg' className='w-full sm:w-auto'>
                Увійти в кабінет
              </Button>
            </Link>
          </div>

          <div className='mt-8 grid gap-3 text-sm sm:grid-cols-3'>
            <div className='flex items-center gap-2'>
              <ShieldCheck className='size-4 text-primary' />
              <span>Безпечний запис</span>
            </div>
            <div className='flex items-center gap-2'>
              <Clock className='size-4 text-primary' />
              <span>Живі слоти</span>
            </div>
            <div className='flex items-center gap-2'>
              <HeartPulse className='size-4 text-primary' />
              <span>Портал пацієнта</span>
            </div>
          </div>
        </div>

        <div className='relative overflow-hidden rounded-lg shadow-soft'>
          <Image
            src='/images/clinic-operations.png'
            alt='Координатор клініки перевіряє розклад на планшеті в сучасній рецепції'
            width={1600}
            height={1000}
            priority
            className='h-[360px] w-full object-cover sm:h-[480px] lg:h-[560px]'
          />
          <div className='absolute inset-x-4 bottom-4 rounded-md bg-white/92 p-4 shadow-soft sm:inset-x-6 sm:bottom-6'>
            <p className='font-display text-xl font-semibold tracking-tight'>Що натиснути?</p>
            <div className='mt-3 grid gap-2 text-sm sm:grid-cols-2'>
              <Link href='/book' className='rounded-md bg-primary px-3 py-2 font-semibold text-white transition hover:bg-primary/90'>
                Я хочу записатись
              </Link>
              <Link href='/login' className='rounded-md border border-border bg-white px-3 py-2 font-semibold transition hover:bg-muted/60'>
                Я вже маю кабінет
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id='how' className='section-rule bg-white/45'>
        <div className='container-max py-12 sm:py-16'>
          <div className='grid gap-8 lg:grid-cols-[0.7fr,1.3fr] lg:items-start'>
            <div>
              <p className='kicker'>Як це працює</p>
              <h2 className='mt-3 font-display text-4xl font-semibold tracking-tight'>Три прості кроки.</h2>
            </div>
            <div className='grid gap-4 md:grid-cols-3'>
              {steps.map((step, index) => (
                <article key={step.title} className='rounded-lg border border-border/75 bg-white/80 p-5'>
                  <span className='grid size-9 place-items-center rounded-full bg-primary text-sm font-semibold text-white'>
                    {index + 1}
                  </span>
                  <h3 className='mt-5 font-display text-xl font-semibold tracking-tight'>{step.title}</h3>
                  <p className='mt-2 text-sm leading-6 text-muted-foreground'>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id='services' className='section-rule'>
        <div className='container-max py-12 sm:py-16'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
            <div>
              <p className='kicker'>Послуги</p>
              <h2 className='mt-3 font-display text-4xl font-semibold tracking-tight'>Оберіть тип візиту.</h2>
            </div>
            <Link href='/book'>
              <Button>
                Записатись
                <ArrowRight className='size-4' />
              </Button>
            </Link>
          </div>

          <div className='mt-8 divide-y divide-border/75 border-y border-border/75'>
            {services.map((service) => (
              <article key={service.name} className='grid gap-4 py-5 md:grid-cols-[1fr,120px,120px,auto] md:items-center'>
                <div>
                  <h3 className='font-display text-2xl font-semibold tracking-tight'>{service.name}</h3>
                  <p className='mt-2 text-sm leading-6 text-muted-foreground'>{service.description}</p>
                </div>
                <p className='text-sm font-semibold'>{service.duration}</p>
                <p className='font-display text-2xl font-semibold'>{service.price}</p>
                <Link href='/book'>
                  <Button variant='outline' size='sm'>
                    Обрати
                  </Button>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id='doctors' className='section-rule bg-white/45'>
        <div className='container-max py-12 sm:py-16'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
            <div>
              <p className='kicker'>Лікарі</p>
              <h2 className='mt-3 font-display text-4xl font-semibold tracking-tight'>Виберіть спеціаліста.</h2>
            </div>
            <Link href='/doctors'>
              <Button variant='outline'>
                Усі профілі
                <ArrowRight className='size-4' />
              </Button>
            </Link>
          </div>

          <div className='mt-8 grid gap-5 md:grid-cols-2'>
            {doctors.map((doctor) => (
              <article key={doctor.name} className='overflow-hidden rounded-lg border border-border/75 bg-white/85'>
                <div className='grid sm:grid-cols-[180px,1fr]'>
                  <div className='relative min-h-64'>
                    <Image
                      src={doctor.image}
                      alt={`${doctor.name}, ${doctor.specialty}`}
                      fill
                      sizes='(max-width: 768px) 100vw, 180px'
                      className='object-cover'
                    />
                  </div>
                  <div className='p-5'>
                    <Stethoscope className='size-5 text-primary' />
                    <h3 className='mt-4 font-display text-2xl font-semibold tracking-tight'>{doctor.name}</h3>
                    <p className='mt-2 text-sm font-semibold text-primary'>{doctor.specialty}</p>
                    <p className='mt-3 text-sm leading-6 text-muted-foreground'>
                      Можна обрати в процесі запису або відкрити профіль лікаря.
                    </p>
                    <div className='mt-5 flex flex-wrap gap-2'>
                      <Link href='/book'>
                        <Button size='sm'>Записатись</Button>
                      </Link>
                      <Link href={doctor.href}>
                        <Button variant='outline' size='sm'>Профіль</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id='cabinet' className='section-rule'>
        <div className='container-max grid gap-8 py-12 sm:py-16 lg:grid-cols-[0.8fr,1.2fr] lg:items-center'>
          <div>
            <p className='kicker'>Особистий кабінет</p>
            <h2 className='mt-3 font-display text-4xl font-semibold tracking-tight'>Після запису все в одному місці.</h2>
            <p className='mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base'>
              Пацієнт бачить майбутні візити, історію, статуси та налаштування повідомлень. Команда клініки працює у
              своїх ролях: адміністратор, лікар, пацієнт.
            </p>
          </div>
          <div className='grid gap-3 sm:grid-cols-3'>
            {cabinetItems.map((item) => {
              const Icon = item.icon;
              return (
              <div key={item.title} className='rounded-lg border border-border/75 bg-white/80 p-5'>
                <Icon className='size-5 text-primary' />
                <p className='mt-4 font-display text-xl font-semibold'>{item.title}</p>
                <p className='mt-2 text-sm leading-6 text-muted-foreground'>{item.text}</p>
              </div>
              );
            })}
            <Link href='/login' className='sm:col-span-3'>
              <Button variant='ink' className='w-full'>
                Увійти в кабінет
                <LogIn className='size-4' />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section id='contact' className='section-rule bg-white/45'>
        <div className='container-max grid gap-8 py-12 sm:py-16 lg:grid-cols-[0.8fr,1.2fr]'>
          <div>
            <p className='kicker'>Контакти</p>
            <h2 className='mt-3 font-display text-4xl font-semibold tracking-tight'>Потрібна допомога?</h2>
            <p className='mt-4 text-sm leading-6 text-muted-foreground'>
              Для екстрених випадків звертайтесь до місцевих служб невідкладної допомоги. Онлайн-запис призначений для
              планових консультацій і follow-up візитів.
            </p>
          </div>

          <div className='grid gap-3'>
            {contactItems.map((item) => {
              const Icon = item.icon;
              return (
              <div key={item.text} className='flex items-center gap-3 rounded-lg border border-border/75 bg-white/80 p-4'>
                <Icon className='size-5 shrink-0 text-primary' />
                <p className='text-sm font-semibold'>{item.text}</p>
              </div>
              );
            })}
            <Link href='/book'>
              <Button size='lg' className='mt-2 w-full sm:w-auto'>
                Записатись онлайн
                <ArrowRight className='size-4' />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
