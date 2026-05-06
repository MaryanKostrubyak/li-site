'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, UserRoundPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const schema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8)
});

type RegisterValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const form = useForm<RegisterValues>({
    resolver: zodResolver(schema)
  });

  const mutation = useMutation({
    mutationFn: api.registerPatient,
    onSuccess: async (payload) => {
      await login(payload.access_token);
      router.push('/dashboard/patient');
    }
  });

  return (
    <div className='mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr,1.1fr] lg:items-start'>
      <section className='lg:pt-8'>
        <p className='kicker'>Доступ пацієнта</p>
        <h1 className='mt-4 font-display text-5xl font-semibold leading-none tracking-tight'>Створіть кабінет пацієнта.</h1>
        <p className='mt-5 max-w-lg text-base leading-7 text-muted-foreground'>
          Зареєструйтесь один раз, щоб керувати записами, профілем і налаштуваннями нагадувань.
        </p>
      </section>

      <section className='soft-panel p-6 sm:p-8'>
        <UserRoundPlus className='size-5 text-primary' />
        <h2 className='mt-5 font-display text-3xl font-semibold tracking-tight'>Дані пацієнта</h2>
        <form className='mt-8 space-y-5' onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <div className='space-y-2'>
            <label className='field-label'>Повне імʼя</label>
            <Input {...form.register('full_name')} />
          </div>
          <div className='space-y-2'>
            <label className='field-label'>Email</label>
            <Input type='email' {...form.register('email')} />
          </div>
          <div className='space-y-2'>
            <label className='field-label'>Телефон</label>
            <Input {...form.register('phone')} />
          </div>
          <div className='space-y-2'>
            <label className='field-label'>Пароль</label>
            <Input type='password' {...form.register('password')} />
          </div>
          <Button type='submit' className='w-full' disabled={mutation.isPending}>
            {mutation.isPending ? 'Створюємо...' : 'Створити кабінет'}
            <ArrowRight className='size-4' />
          </Button>
          {mutation.error ? <Alert variant='danger'>{(mutation.error as Error).message}</Alert> : null}
        </form>
      </section>
    </div>
  );
}
