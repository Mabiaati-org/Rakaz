import type { ReactNode } from 'react';

import { formatIraqiPhoneLocal, type RakazIssuedCredentials } from '@rakaz/contract';

export function Notice({ notice }: { notice: { kind: 'ok' | 'error'; text: string } | null }) {
  if (!notice) return null;
  return (
    <div className={`alert ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
      {notice.text}
    </div>
  );
}

export function PageHead({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {children ? <div className="actions">{children}</div> : null}
    </div>
  );
}

export function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label style={wide ? { gridColumn: '1 / -1' } : undefined}>
      {label}
      {children}
    </label>
  );
}

export function DataState({ loading, error, empty }: { loading: boolean; error: string | null; empty: boolean }) {
  if (error) return <div className="empty error-text">{error}</div>;
  if (loading && empty) return <div className="empty">جارٍ التحميل…</div>;
  if (empty) return <div className="empty">لا توجد بيانات</div>;
  return null;
}

/** Shown once after an account is created or its password is reset; the password cannot be retrieved later. */
export function CredentialsDialog({
  credentials,
  onClose,
}: {
  credentials: RakazIssuedCredentials | null;
  onClose: () => void;
}) {
  if (!credentials) return null;
  const phone = formatIraqiPhoneLocal(credentials.phone);
  const text = `رقم الهاتف: ${phone}\nكلمة المرور المؤقتة: ${credentials.temporaryPassword}`;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="credentials-title">
      <div className="modal card">
        <h2 id="credentials-title">بيانات الدخول</h2>
        <p className="muted">
          سلّم هذه البيانات لصاحب الحساب الآن. لن تظهر كلمة المرور مرة أخرى، وسيُطلب منه تغييرها عند أول دخول.
        </p>
        <dl className="credentials">
          <dt>رقم الهاتف</dt>
          <dd dir="ltr">{phone}</dd>
          <dt>كلمة المرور المؤقتة</dt>
          <dd dir="ltr">
            <code>{credentials.temporaryPassword}</code>
          </dd>
        </dl>
        <div className="actions">
          <button type="button" className="btn secondary" onClick={() => void navigator.clipboard?.writeText(text)}>
            نسخ
          </button>
          <button type="button" className="btn" onClick={onClose}>
            تم التسليم
          </button>
        </div>
      </div>
    </div>
  );
}

export const formatDateTime = (epochMs: number): string =>
  new Date(epochMs).toLocaleString('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' });

export const formatTime = (epochMs: number): string =>
  new Date(epochMs).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });

export const formatDate = (epochMs: number): string => new Date(epochMs).toLocaleDateString('ar-IQ', { dateStyle: 'medium' });

export const formatMoney = (amount: number): string => `${amount.toLocaleString('en-US')} د.ع`;

/** `<input type="date">` value for an epoch, in the browser's timezone. */
export function toDateInput(epochMs: number): string {
  const d = new Date(epochMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const fromDateInput = (value: string): number => new Date(`${value}T12:00:00`).getTime();
