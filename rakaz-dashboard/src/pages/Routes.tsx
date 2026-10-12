import { useState } from 'react';

import type { RakazAdminRoute, RakazAdminRouteInput, RakazAdminRouteStop } from '@rakaz/contract';

import { DataState, Field, Notice, PageHead } from '@/components/ui';
import { useAction, useAsyncData } from '@/hooks/useAsyncData';
import { adminApi } from '@/services/adminApi';

const empty = (schoolId = ''): RakazAdminRouteInput => ({ id: '', name: '', schoolId, depot: null, active: true });

export function RoutesPage() {
  const routes = useAsyncData(() => adminApi.listRoutes());
  const schools = useAsyncData(() => adminApi.listSchools());
  const drivers = useAsyncData(() => adminApi.listDrivers());
  const students = useAsyncData(() => adminApi.listStudents());
  const [draft, setDraft] = useState<RakazAdminRouteInput>(empty());
  const [editing, setEditing] = useState(false);
  const { busy, notice, run } = useAction();

  const schoolId = draft.schoolId || schools.data?.[0]?.id || '';
  const studentName = (id: string): string => students.data?.find((s) => s.id === id)?.fullName ?? id;
  const reload = (): void => {
    routes.reload();
    drivers.reload();
  };

  const save = (): Promise<boolean> =>
    run(async () => {
      await adminApi.saveRoute({ ...draft, id: draft.id.trim(), schoolId });
      setDraft(empty());
      setEditing(false);
      reload();
      return 'تم حفظ المسار';
    });

  const remove = (r: RakazAdminRoute): void => {
    if (!window.confirm(`حذف المسار «${r.name}»؟ سيبقى طلابه بلا مسار.`)) return;
    void run(async () => {
      await adminApi.deleteRoute(r.id);
      reload();
      students.reload();
      return 'تم حذف المسار';
    });
  };

  const assignDriver = (routeId: string, driverUid: string): void => {
    void run(async () => {
      await adminApi.assignDriverToRoute(driverUid || null, routeId);
      reload();
      return driverUid ? 'تم إسناد السائق' : 'أُزيل السائق من المسار';
    });
  };

  const saveStop = (routeId: string, stop: RakazAdminRouteStop): void => {
    void run(async () => {
      await adminApi.assignStudentToRoute(stop.studentId, routeId, stop);
      routes.reload();
    });
  };

  return (
    <section>
      <PageHead title="المسارات" subtitle="كل مسار يخدمه سائق واحد. أضف الطلاب للمسار من صفحة الطلاب ثم رتّب المحطات هنا." />
      <Notice notice={notice} />

      <div className="card">
        <h2>{editing ? `تعديل ${draft.id}` : 'إضافة مسار'}</h2>
        <div className="form-grid">
          <Field label="رمز المسار">
            <input dir="ltr" placeholder="R-204" value={draft.id} disabled={editing} onChange={(e) => setDraft({ ...draft, id: e.target.value })} />
          </Field>
          <Field label="الاسم">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label="المدرسة">
            <select value={schoolId} onChange={(e) => setDraft({ ...draft, schoolId: e.target.value })}>
              {(schools.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="actions">
          <button type="button" className="btn" disabled={busy || !draft.id.trim() || draft.name.trim().length < 2 || !schoolId} onClick={() => void save()}>
            حفظ
          </button>
          {editing ? (
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setDraft(empty());
                setEditing(false);
              }}
            >
              إلغاء التعديل
            </button>
          ) : null}
        </div>
      </div>

      {(routes.data ?? []).map((route) => (
        <div className="card" key={route.id}>
          <div className="card-head">
            <h2>
              {route.name} <code>{route.id}</code>
            </h2>
            <div className="row-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setDraft(route);
                  setEditing(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                تعديل
              </button>
              <button type="button" className="btn danger" onClick={() => remove(route)}>
                حذف
              </button>
            </div>
          </div>
          <div className="form-grid">
            <Field label="السائق">
              <select value={route.driverUid ?? ''} onChange={(e) => assignDriver(route.id, e.target.value)}>
                <option value="">بدون سائق</option>
                {(drivers.data ?? []).map((d) => (
                  <option key={d.uid} value={d.uid}>
                    {d.name} — {d.vehicleLabel}
                    {d.routeId && d.routeId !== route.id ? ` (حالياً على ${d.routeId})` : ''}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الترتيب</th>
                  <th>الطالب</th>
                  <th>وقت الاستلام</th>
                  <th>وقت التوصيل</th>
                </tr>
              </thead>
              <tbody>
                {route.stops.map((stop) => (
                  <tr key={stop.studentId}>
                    <td>
                      <input
                        className="cell-input narrow"
                        type="number"
                        min={1}
                        defaultValue={stop.sequence}
                        onBlur={(e) => {
                          const sequence = Number(e.target.value);
                          if (sequence >= 1 && sequence !== stop.sequence) saveStop(route.id, { ...stop, sequence });
                        }}
                      />
                    </td>
                    <td>
                      {studentName(stop.studentId)} <code>{stop.studentId}</code>
                    </td>
                    <td>
                      <input
                        className="cell-input"
                        type="time"
                        defaultValue={stop.pickupTime}
                        onBlur={(e) => {
                          if (e.target.value && e.target.value !== stop.pickupTime) saveStop(route.id, { ...stop, pickupTime: e.target.value });
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="cell-input"
                        type="time"
                        defaultValue={stop.dropoffTime}
                        onBlur={(e) => {
                          if (e.target.value && e.target.value !== stop.dropoffTime) saveStop(route.id, { ...stop, dropoffTime: e.target.value });
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {route.stops.length === 0 ? <div className="empty">لا يوجد طلاب على هذا المسار</div> : null}
          </div>
        </div>
      ))}
      <DataState loading={routes.loading} error={routes.error} empty={!routes.data?.length} />
    </section>
  );
}
