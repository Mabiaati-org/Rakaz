import { useState } from 'react';

import { formatIraqiPhoneLocal, type RakazAdminGuardian, type RakazIssuedCredentials } from '@rakaz/contract';

import { CredentialsDialog, DataState, Notice, PageHead } from '@/components/ui';
import { useAction, useAsyncData } from '@/hooks/useAsyncData';
import { adminApi } from '@/services/adminApi';

export function GuardiansPage() {
  const { data, error, loading } = useAsyncData(() => adminApi.listGuardians());
  const [credentials, setCredentials] = useState<RakazIssuedCredentials | null>(null);
  const { notice, run } = useAction();

  const resetPassword = (g: RakazAdminGuardian): void => {
    if (!window.confirm(`إصدار كلمة مرور مؤقتة جديدة لـ «${g.name}»؟ سيُسجَّل خروجه من كل الأجهزة.`)) return;
    void run(async () => {
      setCredentials(await adminApi.resetPassword(g.uid));
    });
  };

  return (
    <section>
      <PageHead title="أولياء الأمور" subtitle="تُنشأ الحسابات تلقائياً عند إضافة طالب. من هنا تعيد إصدار كلمة المرور لمن نسيها." />
      <Notice notice={notice} />
      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الهاتف</th>
              <th>الأبناء</th>
              <th>الحالة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((g) => (
              <tr key={g.uid}>
                <td>{g.name}</td>
                <td dir="ltr">{formatIraqiPhoneLocal(g.phone)}</td>
                <td>{g.studentIds.length ? g.studentIds.join('، ') : '—'}</td>
                <td>
                  {g.mustChangePassword ? (
                    <span className="badge warn">لم يسجّل الدخول بعد</span>
                  ) : (
                    <span className={`badge ${g.active ? 'live' : 'idle'}`}>{g.active ? 'مفعّل' : 'موقوف'}</span>
                  )}
                </td>
                <td className="row-actions">
                  <button type="button" className="btn secondary" onClick={() => resetPassword(g)}>
                    كلمة مرور جديدة
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <DataState loading={loading} error={error} empty={!data?.length} />
      </div>
    </section>
  );
}
