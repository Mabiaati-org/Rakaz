import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { normalizeIraqiPhone, RakazApiError, rakazErrorText } from '@rakaz/contract';

import { client, onSessionLost } from '@/services/api';
import { NotificationService } from '@/services/notificationService';
import { accountFromServer } from '@/services/serverMapping';
import { type Account, AccountType } from '@/types/models';
import { Haptics } from '@/utils/haptics';
import { isRecord, Storage } from '@/utils/storage';

/** `setPassword`: signed in with the temporary password, which must be replaced before anything else. */
export type SessionPhase = 'splash' | 'login' | 'setPassword' | 'main';

const ACCOUNT_KEY = 'rakaz.account';

/** An error whose message is ready to show to the user. */
export class AuthError extends Error {}

export function isValidPhone(phone: string): boolean {
  return normalizeIraqiPhone(phone) !== null;
}

function isAccount(value: unknown): value is Account {
  return (
    isRecord(value) &&
    typeof value.phone === 'string' &&
    typeof value.name === 'string' &&
    typeof value.familyName === 'string' &&
    typeof value.mustChangePassword === 'boolean' &&
    value.type === AccountType.guardian
  );
}

const phaseFor = (account: Account | null): SessionPhase =>
  account == null ? 'login' : account.mustChangePassword ? 'setPassword' : 'main';

export const [SessionStoreProvider, useSession] = createContextHook(() => {
  const [phase, setPhase] = useState<SessionPhase>('splash');
  const [account, setAccount] = useState<Account | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const accountRef = useRef<Account | null>(null);
  const splashDone = useRef(false);

  const apply = useCallback((next: Account | null) => {
    accountRef.current = next;
    setAccount(next);
    if (next) Storage.save(ACCOUNT_KEY, next);
    else Storage.remove(ACCOUNT_KEY);
    if (splashDone.current) setPhase(phaseFor(next));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [saved, hasSession] = await Promise.all([Storage.load(ACCOUNT_KEY, isAccount), client.hasSession()]);
      if (cancelled) return;
      // A remembered account is only useful together with the stored session.
      accountRef.current = saved && hasSession ? saved : null;
      setAccount(accountRef.current);
      setHydrated(true);
      if (!accountRef.current) return;
      // Pick up changes made by the administration (name, a reset password) since the last launch.
      try {
        const me = await client.me();
        if (!cancelled) apply(accountFromServer(me));
      } catch {
        // Offline: keep the remembered account. A rejected session is reported through onSessionLost.
      }
    })();
    const off = onSessionLost(() => apply(null));
    return () => {
      cancelled = true;
      off();
    };
  }, [apply]);

  const finishSplash = useCallback(() => {
    splashDone.current = true;
    setPhase(phaseFor(accountRef.current));
  }, []);

  const login = useCallback(
    async (phone: string, password: string) => {
      if (!isValidPhone(phone)) throw new AuthError('رقم الهاتف غير صحيح. أدخل رقماً عراقياً يبدأ بـ ٧ (١٠ أرقام).');
      if (password.length === 0) throw new AuthError('أدخل كلمة المرور.');
      try {
        const session = await client.login(phone, password);
        if (session.user.role !== 'guardian') {
          await client.logout();
          throw new AuthError('هذا الحساب ليس حساب ولي أمر.');
        }
        Haptics.success();
        apply(accountFromServer(session.user));
      } catch (error) {
        throw error instanceof AuthError ? error : new AuthError(rakazErrorText(error));
      }
    },
    [apply],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      try {
        const session = await client.changePassword(currentPassword, newPassword);
        Haptics.success();
        apply(accountFromServer(session.user));
      } catch (error) {
        throw new AuthError(rakazErrorText(error));
      }
    },
    [apply],
  );

  const deleteAccount = useCallback(
    async (password: string) => {
      try {
        await client.deleteAccount(password);
        apply(null);
      } catch (error) {
        throw new AuthError(rakazErrorText(error));
      }
    },
    [apply],
  );

  const logout = useCallback(() => {
    // Stop pushes to this phone before the session that authorises the call is gone.
    void NotificationService.unregister()
      .then(() => client.logout())
      .catch((error: unknown) => {
        if (!(error instanceof RakazApiError)) console.log('[Session] logout failed', error);
      });
    apply(null);
  }, [apply]);

  return useMemo(
    () => ({ phase, account, hydrated, finishSplash, login, changePassword, deleteAccount, logout }),
    [phase, account, hydrated, finishSplash, login, changePassword, deleteAccount, logout],
  );
});
