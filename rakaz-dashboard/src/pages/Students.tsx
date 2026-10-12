import { useState } from 'react';

import { formatIraqiPhoneLocal, type RakazAdminStudent, type RakazAdminStudentInput, type RakazIssuedCredentials } from '@rakaz/contract';

import { CredentialsDialog, DataState, Field, Notice, PageHead } from '@/components/ui';
import { useAction, useAsyncData } from '@/hooks/useAsyncData';
import { adminApi } from '@/services/adminApi';

type Draft = RakazAdminStudentInput & { routeId: string | null };

const empty = (schoolId = ''): Draft => ({
  internalNumber: '',
  fullName: '',
  firstName: '',
  grade: '',
  stage: '',
  gender: null,
  birthDate: null,
  schoolId,
  guardianName: '',
  guardianPhone: '',
  home: { latitude: 30.52, longitude: 47.79 },
  governorate: '',
  area: '',
  neighborhood: '',
  street: '',
  landmark: '',
  accessNotes: '',
  notes: '',
  active: true,
  routeId: null,
});

const toDraft = (s: RakazAdminStudent): Draft => ({ ...s, guardianPhone: formatIraqiPhoneLocal(s.guardianPhone) });

export function StudentsPage() {
  const students = useAsyncData(() => adminApi.listStudents());
  const schools = useAsyncData(() => adminApi.listSchools());
  const routes = useAsyncData(() => adminApi.listRoutes());
  const [draft, setDraft] = useState<Draft>(empty());
  const [credentials, setCredentials] = useState<RakazIssuedCredentials | null>(null);
  const { busy, notice, run } = useAction();
  const set = <K extends keyof Draft>(key: K, value: Draft[K]): void => setDraft((d) => ({ ...d, [key]: value }));

  const editing = Boolean(draft.id);
  const schoolId = draft.schoolId || schools.data?.[0]?.id || '';
  const valid = draft.fullName.trim().length >= 2 && draft.guardianName.trim().length >= 2 && draft.guardianPhone.trim() && schoolId;

  const save = (): Promise<boolean> =>
    run(async () => {
      const { routeId, ...input } = draft;
      const firstName = input.firstName.trim() || input.fullName.trim().split(/\s+/)[0] || input.fullName;
      const result = await adminApi.saveStudent({ ...input, firstName, schoolId });
      if (routeId !== result.student.routeId) await adminApi.assignStudentToRoute(result.student.id, routeId);
      setCredentials(result.guardianCredentials);
      setDraft(empty());
      students.reload();
      return `تم حفظ الطالب ${result.student.fullName} (${result.student.id})`;
    });

  const remove = (s: RakazAdminStudent): void => {
    if (!window.confirm(`حذف الطالب «${s.fullName}»؟`)) return;
    void run(async () => {
      await adminApi.deleteStudent(s.id);
      students.reload();
      return 'تم حذف الطالب';
    });
  };

  return (
    <section>
      <PageHead title="الطلاب" subtitle="إضافة طالب تنشئ حساب ولي الأمر تلقائياً إذا لم يكن رقمه مسجّلاً." />
      <Notice notice={notice} />
      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
      {schools.data && schools.data.length === 0 ? <div className="alert error">أضف مدرسة أولاً من صفحة المدارس.</div> : null}

      <div className="card">
        <h2>{editing ? `تعديل ${draft.id}` : 'إضافة طالب'}</h2>
        <div className="form-grid">
          <Field label="الاسم الكامل">
            <input value={draft.fullName} onChange={(e) => set('fullName', e.target.value)} />
          </Field>
          <Field label="الاسم الأول (يظهر في الإشعارات)">
            <input value={draft.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="يُؤخذ من الاسم الكامل إن تُرك فارغاً" />
          </Field>
          <Field label="الرقم الداخلي">
            <input value={draft.internalNumber} onChange={(e) => set('internalNumber', e.target.value)} />
          </Field>
          <Field label="الجنس">
            <select value={draft.gender ?? ''} onChange={(e) => set('gender', (e.target.value || null) as Draft['gender'])}>
              <option value="">غير محدد</option>
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
            </select>
          </Field>
          <Field label="المرحلة">
            <input value={draft.stage} onChange={(e) => set('stage', e.target.value)} placeholder="الابتدائية" />
          </Field>
          <Field label="الصف">
            <input value={draft.grade} onChange={(e) => set('grade', e.target.value)} placeholder="الصف الرابع" />
          </Field>
          <Field label="المدرسة">
            <select value={schoolId} onChange={(e) => set('schoolId', e.target.value)}>
              {(schools.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="المسار">
            <select value={draft.routeId ?? ''} onChange={(e) => set('routeId', e.target.value || null)}>
              <option value="">بدون مسار</option>
              {(routes.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.id})
                </option>
              ))}
            </select>
          </Field>
          <Field label="اسم ولي الأمر">
            <input value={draft.guardianName} onChange={(e) => set('guardianName', e.target.value)} />
          </Field>
          <Field label="هاتف ولي الأمر">
            <input dir="ltr" inputMode="tel" placeholder="07XXXXXXXXX" value={draft.guardianPhone} onChange={(e) => set('guardianPhone', e.target.value)} />
          </Field>
          <Field label="المحافظة">
            <input value={draft.governorate} onChange={(e) => set('governorate', e.target.value)} />
          </Field>
          <Field label="المنطقة">
            <input value={draft.area} onChange={(e) => set('area', e.target.value)} />
          </Field>
          <Field label="الشارع">
            <input value={draft.street} onChange={(e) => set('street', e.target.value)} />
          </Field>
          <Field label="أقرب نقطة دالة">
            <input value={draft.landmark} onChange={(e) => set('landmark', e.target.value)} />
          </Field>
          <Field label="خط عرض المنزل">
            <input dir="ltr" type="number" step="any" value={draft.home.latitude} onChange={(e) => set('home', { ...draft.home, latitude: Number(e.target.value) })} />
          </Field>
          <Field label="خط طول المنزل">
            <input dir="ltr" type="number" step="any" value={draft.home.longitude} onChange={(e) => set('home', { ...draft.home, longitude: Number(e.target.value) })} />
          </Field>
          <Field label="ملاحظات للسائق" wide>
            <input value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </div>
        <div className="actions">
          <button type="button" className="btn" disabled={busy || !valid} onClick={() => void save()}>
            حفظ
          </button>
          {editing ? (
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
              <th>الرمز</th>
              <th>الاسم</th>
              <th>الصف</th>
              <th>المدرسة</th>
              <th>المسار</th>
              <th>ولي الأمر</th>
              <th>الهاتف</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(students.data ?? []).map((s) => (
              <tr key={s.id}>
                <td>
                  <code>{s.id}</code>
                </td>
                <td>{s.fullName}</td>
                <td>{s.grade || '—'}</td>
                <td>{s.schoolName}</td>
                <td>{s.routeId ?? '—'}</td>
                <td>
                  {s.guardianName}
                  {s.guardianUid ? null : <span className="badge warn">بلا حساب</span>}
                </td>
                <td dir="ltr">{formatIraqiPhoneLocal(s.guardianPhone)}</td>
                <td className="row-actions">
                  <button type="button" className="btn secondary" onClick={() => setDraft(toDraft(s))}>
                    تعديل
                  </button>
                  <button type="button" className="btn danger" onClick={() => remove(s)}>
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <DataState loading={students.loading} error={students.error} empty={!students.data?.length} />
      </div>
    </section>
  );
}
