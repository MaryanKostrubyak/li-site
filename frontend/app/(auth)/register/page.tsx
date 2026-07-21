'use client';

import { useMutation } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' });
  const mutation = useMutation({ mutationFn: () => register(form), onSuccess: () => router.push('/dashboard/patient') });
  const field = (key: keyof typeof form) => ({ value: form[key], onChange: (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value })) });
  return (
    <div className='mx-auto max-w-xl'>
      <p className='kicker'>Patient account</p><h1 className='page-title mt-4'>Keep your visits in one place.</h1><p className='page-subtitle'>Create an account once, then book, reschedule, or cancel from your patient portal.</p>
      <form className='surface mt-8 space-y-5 p-6 sm:p-8' onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
        <div><label className='field-label' htmlFor='register-name'>Full name</label><Input id='register-name' className='mt-2' required minLength={2} {...field('full_name')} /></div>
        <div><label className='field-label' htmlFor='register-email'>Email</label><Input id='register-email' className='mt-2' type='email' required {...field('email')} /></div>
        <div><label className='field-label' htmlFor='register-phone'>Phone (optional)</label><Input id='register-phone' className='mt-2' {...field('phone')} /></div>
        <div><label className='field-label' htmlFor='register-password'>Password</label><Input id='register-password' className='mt-2' type='password' required minLength={8} {...field('password')} /></div>
        <Button className='w-full' type='submit' disabled={mutation.isPending}>Create account <ArrowRight className='size-4' /></Button>
        {mutation.error ? <Alert variant='danger'>{mutation.error.message}</Alert> : null}
      </form>
    </div>
  );
}
