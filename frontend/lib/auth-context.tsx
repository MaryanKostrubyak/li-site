'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api } from '@/lib/api';
import type { AuthMe, UserRole } from '@/types/api';

type Credentials = { email: string; password: string };
type Registration = Credentials & { full_name: string; phone?: string };

type AuthContextValue = {
  me: AuthMe | null;
  loading: boolean;
  login: (credentials: Credentials) => Promise<AuthMe>;
  register: (registration: Registration) => Promise<AuthMe>;
  demoLogin: (role: UserRole) => Promise<AuthMe>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<AuthMe | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setMe(await api.me());
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api.me()
      .then((session) => { if (active) setMe(session); })
      .catch(() => { if (active) setMe(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (credentials: Credentials) => {
    const session = await api.login(credentials);
    setMe(session);
    return session;
  }, []);

  const register = useCallback(async (registration: Registration) => {
    const session = await api.registerPatient(registration);
    setMe(session);
    return session;
  }, []);

  const demoLogin = useCallback(async (role: UserRole) => {
    const session = await api.demoLogin(role);
    setMe(session);
    return session;
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } finally { setMe(null); }
  }, []);

  const value = useMemo(
    () => ({ me, loading, login, register, demoLogin, logout, refresh }),
    [me, loading, login, register, demoLogin, logout, refresh]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
