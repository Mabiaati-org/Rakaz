import { useState } from 'react';

import type { RakazAdminSchoolInput } from '@rakaz/contract';

import { MapPicker } from '@/components/maps';
import { DataState, Field, Notice, PageHead } from '@/components/ui';
import { useAction, useAsyncData } from '@/hooks/useAsyncData';
import { adminApi } from '@/services/adminApi';

const empty = (): RakazAdminSchoolInput => ({
  name: '',
  address: '',
  locationLabel: '',
  coordinate: { latitude: 30.5156, longitude: 47.8125 },
  phone: '',
  startTime: '07:45',
  endTime: '13:15',
});

export function SchoolsPage() {
  const { data, error, loading, reload } = useAsyncData(() => adminApi.listSchools());
  const [draft, setDraft] = useState<RakazAdminSchoolInput>(empty());
  const { busy, notice, run } = useAction();
  const set = <K extends keyof RakazAdminSchoolInput>(key: K, value: RakazAdminSchoolInput[K]): void =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = (): Promise<boolean> =>
    run(async () => {
      await adminApi.saveSchool(draft);
      setDraft(empty());
      reload();
      return 'تم حفظ المدرسة';
    });

  const remove = (id: string, name: string): void => {
    if (!window.confirm(`حذف المدرسة «${name}»؟`)) return;
    void run(async () => {
      await adminApi.deleteSchool(id);
      reload();
      return 'تم حذف المدرسة';
    });
  };

  return (
    <section>
      <PageHead title="المدارس" subtitle="المدارس التي تخدمها المسارات" />
      <Notice notice={notice} />

      <div className="card">
        <h2>{draft.id ? 'تعديل مدرسة' : 'إضافة مدرسة'}</h2>
        <div className="form-grid">
          <Field label="الاسم">
            <input value={draft.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="العنوان">
            <input value={draft.address} onChange={(e) => set('address', e.target.value)} />
          </Field>
          <Field label="وصف نقطة النزول (مثل: البوابة ٣)">
            <input value={draft.locationLabel} onChange={(e) => set('locationLabel', e.target.value)} />
          </Field>
          <Field label="الهاتف">
            <input dir="ltr" value={draft.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label="خط العرض">
            <input dir="ltr" type="number" step="any" value={draft.coordinate.latitude} onChange={(e) => set('coordinate', { ...draft.coordinate, latitude: Number(e.target.value) })} />
          </Field>
          <Field label="خط الطول">
            <input dir="ltr" type="number" step="any" value={draft.coordinate.longitude} onChange={(e) => set('coordinate', { ...draft.coordinate, longitude: Number(e.target.value) })} />
          </Field>
          <Field label="الموقع على الخريطة — اضغط لتحديد بوابة المدرسة" wide>
            <MapPicker value={draft.coordinate} onChange={(coordinate) => set('coordinate', coordinate)} />
          </Field>
          <Field label="بداية الدوام">
            <input type="time" value={draft.startTime} onChange={(e) => set('startTime', e.target.value)} />
          </Field>
          <Field label="نهاية الدوام">
            <input type="time" value={draft.endTime} onChange={(e) => set('endTime', e.target.value)} />
          </Field>
        </div>
        <div className="actions">
          <button type="button" className="btn" disabled={busy || draft.name.trim().length < 2} onClick={() => void save()}>
            حفظ
          </button>
          {draft.id ? (
            <button type="button" className="btn secondary" onClick={() => setDraft(empty())}>
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
              <th>العنوان</th>
              <th>الدوام</th>
              <th>الهاتف</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.address}</td>
                <td dir="ltr">
                  {s.startTime} – {s.endTime}
                </td>
                <td dir="ltr">{s.phone || '—'}</td>
                <td className="row-actions">
                  <button type="button" className="btn secondary" onClick={() => setDraft(s)}>
                    تعديل
                  </button>
                  <button type="button" className="btn danger" onClick={() => remove(s.id, s.name)}>
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
