import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { api } from '../api/client';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('asb_token'));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(token));

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api<{ user: User }>('/api/auth/me', { token })
      .then((r) => setUser(r.user))
      .catch(() => { setToken(null); localStorage.removeItem('asb_token'); })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      json: { email, password },
    });
    localStorage.setItem('asb_token', r.token);
    setToken(r.token);
    setUser(r.user);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const r = await api<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      json: { email, password },
    });
    localStorage.setItem('asb_token', r.token);
    setToken(r.token);
    setUser(r.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('asb_token');
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
