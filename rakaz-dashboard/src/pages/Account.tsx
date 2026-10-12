import { useState, type FormEvent } from 'react';

import { RAKAZ_MIN_PASSWORD_LENGTH } from '@rakaz/contract';

import { useAuth } from '@/auth/AuthContext';
import { Notice, PageHead } from '@/components/ui';
import { useAction } from '@/hooks/useAsyncData';

/** `forced` renders the page alone, for an account that must replace its temporary password. */
export function AccountPage({ forced = false }: { forced?: boolean }) {
  const { user, changePassword, logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const { busy, notice, run } = useAction();

  const mismatch = confirm.length > 0 && next !== confirm;
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    void run(async () => {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      return 'تم تغيير كلمة المرور';
    });
  };

  const form = (
    <form className="card" onSubmit={submit} style={{ maxWidth: 460 }}>
      <h2>تغيير كلمة المرور</h2>
      {forced ? <p className="muted">يجب تغيير كلمة المرور المؤقتة قبل استخدام اللوحة.</p> : null}
      <Notice notice={notice} />
      <div className="form-grid single">
        <label>
          كلمة المرور الحالية
          <input dir="ltr" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </label>
        <label>
          كلمة المرور الجديدة ({RAKAZ_MIN_PASSWORD_LENGTH} أحرف على الأقل، حرف ورقم)
          <input dir="ltr" type="password" autoComplete="new-password" minLength={RAKAZ_MIN_PASSWORD_LENGTH} value={next} onChange={(e) => setNext(e.target.value)} required />
        </label>
        <label>
          تأكيد كلمة المرور الجديدة
          <input dir="ltr" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </label>
      </div>
      {mismatch ? <p className="error-text">كلمتا المرور غير متطابقتين</p> : null}
      <div className="actions">
        <button type="submit" className="btn" disabled={busy || mismatch || !current || !next}>
          حفظ
        </button>
        {forced ? (
          <button type="button" className="btn secondary" onClick={() => void logout()}>
            تسجيل الخروج
          </button>
        ) : null}
      </div>
    </form>
  );

  if (forced) return <div className="login-screen">{form}</div>;
  return (
    <section>
      <PageHead title="حسابي" subtitle={`${user?.name ?? ''} · ${user?.phone ?? ''}`} />
      {form}
    </section>
  );
}
