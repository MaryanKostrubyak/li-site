'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api } from '@/lib/api';
import { AuthMe } from '@/types/api';

type AuthContextValue = {
  token: string | null;
  me: AuthMe | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'clinic_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<AuthMe | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async (activeToken: string) => {
    const profile = await api.me(activeToken);
    setMe(profile);
  }, []);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      const stored = window.localStorage.getItem(TOKEN_KEY);
      if (!stored) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      if (active) {
        setToken(stored);
      }

      try {
        await refreshMe(stored);
      } catch {
        window.localStorage.removeItem(TOKEN_KEY);
        if (active) {
          setToken(null);
          setMe(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void initialize();
    return () => {
      active = false;
    };
  }, [refreshMe]);

  const login = useCallback(async (newToken: string) => {
    window.localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    await refreshMe(newToken);
  }, [refreshMe]);

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setMe(null);
  }, []);

  const value = useMemo(
    () => ({ token, me, loading, login, logout }),
    [token, me, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
