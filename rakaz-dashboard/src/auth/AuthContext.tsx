import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { RakazHttpPaths, type RakazAuthSession, type RakazAuthUser } from '@rakaz/contract';

import {
  api,
  ApiRequestError,
  clearSession,
  currentRefreshToken,
  hasStoredSession,
  onSessionLost,
  publicApi,
  storeSession,
} from '@/services/client';

interface AuthState {
  /** `undefined` while the stored session is being checked on page load. */
  user: RakazAuthUser | null | undefined;
  login(phone: string, password: string): Promise<void>;
  logout(): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<RakazAuthUser | null | undefined>(hasStoredSession() ? undefined : null);

  useEffect(() => {
    if (!hasStoredSession()) return;
    let cancelled = false;
    api<RakazAuthUser>(RakazHttpPaths.auth.me)
      .then((me) => {
        if (!cancelled) setUser(me.role === 'admin' ? me : null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => onSessionLost(() => setUser(null)), []);

  const login = useCallback(async (phone: string, password: string) => {
    const session = await publicApi<RakazAuthSession>(RakazHttpPaths.auth.login, { phone, password });
    if (session.user.role !== 'admin') {
      throw new ApiRequestError('هذا الحساب ليس حساب إدارة. استخدم تطبيق الهاتف.', 403);
    }
    storeSession(session);
    setUser(session.user);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = currentRefreshToken();
    clearSession();
    setUser(null);
    if (refreshToken) {
      await publicApi(RakazHttpPaths.auth.logout, { refreshToken }).catch(() => undefined);
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const session = await api<RakazAuthSession>(RakazHttpPaths.auth.changePassword, 'POST', {
      currentPassword,
      newPassword,
    });
    storeSession(session);
    setUser(session.user);
  }, []);

  const value = useMemo(() => ({ user, login, logout, changePassword }), [user, login, logout, changePassword]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
