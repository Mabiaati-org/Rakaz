import { useState, type FormEvent } from 'react';

import { useAuth } from '@/auth/AuthContext';
import { Notice } from '@/components/ui';
import { useAction } from '@/hooks/useAsyncData';

export function LoginPage() {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const { busy, notice, run } = useAction();

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    void run(() => login(phone, password));
  };

  return (
    <div className="login-screen">
      <form className="card login-card" onSubmit={submit}>
        <div className="brand dark">
          <strong>ركاز</strong>
          <span>لوحة الإدارة</span>
        </div>
        <Notice notice={notice} />
        <div className="form-grid single">
          <label>
            رقم الهاتف
            <input
              dir="ltr"
              inputMode="tel"
              autoComplete="username"
              placeholder="07XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </label>
          <label>
            كلمة المرور
            <input
              dir="ltr"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
        </div>
        <button type="submit" className="btn block" disabled={busy || !phone || !password}>
          {busy ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
        </button>
      </form>
    </div>
  );
}
