'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

type LoginValues = z.infer<typeof schema>;

const demoAccounts = [
  ['Адмін', 'admin@aiclinic.demo', 'AdminPass123!'],
  ['Лікар', 'doctor.smith@aiclinic.demo', 'DoctorPass123!'],
  ['Пацієнт', 'patient.johnson@aiclinic.demo', 'PatientPass123!']
] as const;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: 'admin@aiclinic.demo',
      password: 'AdminPass123!'
    }
  });

  const mutation = useMutation({
    mutationFn: api.login,
    onSuccess: async (payload) => {
      await login(payload.access_token);
      router.push(`/dashboard/${payload.role}`);
    }
  });

  return (
    <div className='mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr,420px] lg:items-stretch'>
      <section className='ink-panel p-6 sm:p-8 lg:p-10'>
        <ShieldCheck className='size-6 text-white/70' />
        <h1 className='mt-6 font-display text-5xl font-semibold leading-none tracking-tight'>Увійдіть у кабінет клініки.</h1>
        <p className='mt-5 max-w-xl text-sm leading-6 text-white/70 sm:text-base'>
          Оберіть демо-роль, щоб переглянути кабінет адміністратора, лікаря або пацієнта без створення зовнішніх
          акаунтів.
        </p>

        <div className='mt-10 divide-y divide-white/10 border-y border-white/10'>
          {demoAccounts.map(([role, email, password]) => (
            <button
              key={role}
              type='button'
              className='grid w-full gap-2 py-4 text-left transition hover:bg-white/[0.04] sm:grid-cols-[100px,1fr]'
              onClick={() => form.reset({ email, password })}
            >
              <span className='text-xs font-semibold uppercase tracking-[0.16em] text-white/45'>{role}</span>
              <span className='min-w-0 text-sm text-white/78'>
                <strong className='font-semibold text-white'>{email}</strong>
                <span className='mx-2 text-white/25'>/</span>
                <span>{password}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className='soft-panel p-6 sm:p-8'>
        <KeyRound className='size-5 text-primary' />
        <h2 className='mt-5 font-display text-3xl font-semibold tracking-tight'>Вхід</h2>
        <p className='mt-2 text-sm leading-6 text-muted-foreground'>Демо-акаунт адміністратора вже підставлено.</p>

        <form className='mt-8 space-y-5' onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <div className='space-y-2'>
            <label className='field-label'>Email</label>
            <Input type='email' {...form.register('email')} />
          </div>
          <div className='space-y-2'>
            <label className='field-label'>Пароль</label>
            <Input type='password' {...form.register('password')} />
          </div>
          <Button type='submit' className='w-full' disabled={mutation.isPending}>
            {mutation.isPending ? 'Входимо...' : 'Увійти'}
            <ArrowRight className='size-4' />
          </Button>
          {mutation.error ? <Alert variant='danger'>{(mutation.error as Error).message}</Alert> : null}
        </form>
      </section>
    </div>
  );
}
