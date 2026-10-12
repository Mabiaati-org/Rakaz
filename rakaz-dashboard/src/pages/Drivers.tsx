import { useState } from 'react';

import { formatIraqiPhoneLocal, type RakazAdminDriver, type RakazAdminDriverInput, type RakazIssuedCredentials } from '@rakaz/contract';

import { CredentialsDialog, DataState, Field, Notice, PageHead } from '@/components/ui';
import { useAction, useAsyncData } from '@/hooks/useAsyncData';
import { adminApi } from '@/services/adminApi';

const empty = (): RakazAdminDriverInput => ({
  name: '',
  phone: '',
  vehicleLabel: '',
  plateNumber: '',
  vehicleModel: '',
  vehicleColor: '',
  vehicleCapacity: null,
  active: true,
});

export function DriversPage() {
  const { data, error, loading, reload } = useAsyncData(() => adminApi.listDrivers());
  const [draft, setDraft] = useState<RakazAdminDriverInput>(empty());
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<RakazIssuedCredentials | null>(null);
  const { busy, notice, run } = useAction();
  const set = <K extends keyof RakazAdminDriverInput>(key: K, value: RakazAdminDriverInput[K]): void =>
    setDraft((d) => ({ ...d, [key]: value }));

  const reset = (): void => {
    setDraft(empty());
    setEditingUid(null);
  };

  const save = (): Promise<boolean> =>
    run(async () => {
      const result = editingUid ? await adminApi.updateDriver(editingUid, draft) : await adminApi.createDriver(draft);
      setCredentials(result.credentials);
      reset();
      reload();
      return `تم حفظ السائق ${result.driver.name}`;
    });

  const edit = (d: RakazAdminDriver): void => {
    setEditingUid(d.uid);
    setDraft({ ...d, phone: formatIraqiPhoneLocal(d.phone) });
  };

  const remove = (d: RakazAdminDriver): void => {
    if (!window.confirm(`حذف حساب السائق «${d.name}»؟`)) return;
    void run(async () => {
      await adminApi.deleteDriver(d.uid);
      reload();
      return 'تم حذف السائق';
    });
  };

  const resetPassword = (d: RakazAdminDriver): void => {
    if (!window.confirm(`إصدار كلمة مرور مؤقتة جديدة لـ «${d.name}»؟ سيُسجَّل خروجه من كل الأجهزة.`)) return;
    void run(async () => {
      setCredentials(await adminApi.resetPassword(d.uid));
    });
  };

  return (
    <section>
      <PageHead title="السائقون" subtitle="إسناد السائق لمسار يتم من صفحة المسارات." />
      <Notice notice={notice} />
      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />

      <div className="card">
        <h2>{editingUid ? 'تعديل سائق' : 'إضافة سائق'}</h2>
        <div className="form-grid">
          <Field label="الاسم">
            <input value={draft.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="الهاتف">
            <input dir="ltr" inputMode="tel" placeholder="07XXXXXXXXX" value={draft.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label="اسم / رقم الباص">
            <input value={draft.vehicleLabel} onChange={(e) => set('vehicleLabel', e.target.value)} placeholder="باص 17" />
          </Field>
          <Field label="رقم اللوحة">
            <input value={draft.plateNumber} onChange={(e) => set('plateNumber', e.target.value)} />
          </Field>
          <Field label="نوع المركبة">
            <input value={draft.vehicleModel} onChange={(e) => set('vehicleModel', e.target.value)} placeholder="Toyota Coaster" />
          </Field>
          <Field label="اللون">
            <input value={draft.vehicleColor} onChange={(e) => set('vehicleColor', e.target.value)} />
          </Field>
          <Field label="عدد المقاعد">
            <input
              dir="ltr"
              type="number"
              min={1}
              max={100}
              value={draft.vehicleCapacity ?? ''}
              onChange={(e) => set('vehicleCapacity', e.target.value ? Number(e.target.value) : null)}
            />
          </Field>
          <Field label="الحالة">
            <select value={draft.active ? '1' : '0'} onChange={(e) => set('active', e.target.value === '1')}>
              <option value="1">مفعّل</option>
              <option value="0">موقوف</option>
            </select>
          </Field>
        </div>
        <div className="actions">
          <button type="button" className="btn" disabled={busy || draft.name.trim().length < 2 || !draft.phone.trim() || !draft.vehicleLabel.trim()} onClick={() => void save()}>
            حفظ
          </button>
          {editingUid ? (
            <button type="button" className="btn secondary" onClick={reset}>
              إلغاء التعديل
            </button>
          ) : null}
        </div>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الهاتف</th>
              <th>الباص</th>
              <th>اللوحة</th>
              <th>المسار</th>
              <th>الحالة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((d) => (
              <tr key={d.uid}>
                <td>{d.name}</td>
                <td dir="ltr">{formatIraqiPhoneLocal(d.phone)}</td>
                <td>{d.vehicleLabel}</td>
                <td>{d.plateNumber || '—'}</td>
                <td>{d.routeId ?? <span className="badge warn">بلا مسار</span>}</td>
                <td>
                  <span className={`badge ${d.active ? 'live' : 'idle'}`}>{d.active ? 'مفعّل' : 'موقوف'}</span>
                </td>
                <td className="row-actions">
                  <button type="button" className="btn secondary" onClick={() => edit(d)}>
                    تعديل
                  </button>
                  <button type="button" className="btn secondary" onClick={() => resetPassword(d)}>
                    كلمة مرور جديدة
                  </button>
                  <button type="button" className="btn danger" onClick={() => remove(d)}>
                    حذف
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
