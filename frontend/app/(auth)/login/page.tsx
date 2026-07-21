'use client';

import { useMutation } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import type { UserRole } from '@/types/api';

const roles: Array<{ role: UserRole; title: string; description: string }> = [
  { role: 'patient', title: 'Patient', description: 'Appointments, history, and preferences' },
  { role: 'doctor', title: 'Doctor', description: 'Today’s visits, notes, and schedule' },
  { role: 'admin', title: 'Admin', description: 'Operations, appointments, and patients' }
];

export default function LoginPage() {
  const router = useRouter();
  const { login, demoLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const signIn = useMutation({ mutationFn: () => login({ email, password }), onSuccess: (session) => router.push(`/dashboard/${session.user.role}`) });
  const quickAccess = useMutation({ mutationFn: (role: UserRole) => demoLogin(role), onSuccess: (session) => router.push(`/dashboard/${session.user.role}`) });

  return (
    <div className='grid gap-12 lg:grid-cols-[1fr,0.9fr]'>
      <section>
        <p className='kicker'>Quick access</p><h1 className='page-title mt-4'>Choose a role and get to work.</h1>
        <p className='page-subtitle'>Open the workspace that fits the way you use the clinic.</p>
        <div className='mt-8 divide-y divide-border border-y border-border'>
          {roles.map((item) => <button key={item.role} type='button' onClick={() => quickAccess.mutate(item.role)} disabled={quickAccess.isPending} className='grid w-full gap-2 py-5 text-left hover:pl-2 focus-ring sm:grid-cols-[120px,1fr]'><strong>{item.title}</strong><span className='text-sm text-muted-foreground'>{item.description}</span></button>)}
        </div>
        {quickAccess.error ? <Alert variant='danger' className='mt-5'>{quickAccess.error.message}</Alert> : null}
      </section>
      <section className='surface p-6 sm:p-8'>
        <h2 className='font-display text-3xl'>Sign in</h2><p className='mt-2 text-sm text-muted-foreground'>Use an existing patient or staff account.</p>
        <form className='mt-7 space-y-5' onSubmit={(event) => { event.preventDefault(); signIn.mutate(); }}>
          <div><label className='field-label' htmlFor='login-email'>Email</label><Input id='login-email' className='mt-2' type='email' value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
          <div><label className='field-label' htmlFor='login-password'>Password</label><Input id='login-password' className='mt-2' type='password' value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /></div>
          <Button type='submit' className='w-full' disabled={signIn.isPending}>Sign in <ArrowRight className='size-4' /></Button>
          {signIn.error ? <Alert variant='danger'>{signIn.error.message}</Alert> : null}
        </form>
      </section>
    </div>
  );
}
