import { useState } from 'react';

import type { RakazBroadcastInput } from '@rakaz/contract';

import { Field, Notice, PageHead } from '@/components/ui';
import { useAction, useAsyncData } from '@/hooks/useAsyncData';
import { adminApi } from '@/services/adminApi';

const AUDIENCES: Array<{ value: RakazBroadcastInput['audience']; label: string }> = [
  { value: 'guardians', label: 'أولياء الأمور' },
  { value: 'drivers', label: 'السائقون' },
  { value: 'everyone', label: 'الجميع' },
];

export function OverviewPage() {
  const overview = useAsyncData(() => adminApi.getOverview());
  const routes = useAsyncData(() => adminApi.listRoutes());
  const [title, setTitle] = useState('تنبيه من الإدارة');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<RakazBroadcastInput['audience']>('guardians');
  const [routeId, setRouteId] = useState('');
  const { busy, notice, run } = useAction();

  const send = (): Promise<boolean> =>
    run(async () => {
      const result = await adminApi.broadcast({ title, body, audience, routeId: routeId || undefined });
      setBody('');
      return `أُرسل الإشعار إلى ${result.recipients} مستخدم`;
    });

  const stats: Array<[string, number | undefined]> = [
    ['رحلات نشطة', overview.data?.activeTrips],
    ['طلاب في الباص', overview.data?.studentsOnBoard],
    ['غيابات اليوم', overview.data?.absencesToday],
    ['بانتظار تأكيد الاستلام', overview.data?.openHandovers],
    ['بلاغات طارئة اليوم', overview.data?.emergenciesToday],
    ['تذاكر دعم مفتوحة', overview.data?.openTickets],
    ['سائقون بلا مسار', overview.data?.unassignedDrivers],
  ];

  return (
    <section>
      <PageHead title="نظرة عامة" subtitle="مؤشرات اليوم الحالي">
        <button type="button" className="btn secondary" onClick={overview.reload}>
          تحديث
        </button>
      </PageHead>

      {overview.error ? <div className="alert error">{overview.error}</div> : null}
      <div className="grid stats">
        {stats.map(([label, value]) => (
          <div className="card stat" key={label}>
            <div className="label">{label}</div>
            <div className="value">{value ?? '—'}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>إرسال إشعار</h2>
        <Notice notice={notice} />
        <div className="form-grid">
          <Field label="إلى">
            <select value={audience} onChange={(e) => setAudience(e.target.value as RakazBroadcastInput['audience'])}>
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="المسار">
            <select value={routeId} onChange={(e) => setRouteId(e.target.value)}>
              <option value="">كل المسارات</option>
              {(routes.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.id})
                </option>
              ))}
            </select>
          </Field>
          <Field label="العنوان">
            <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="النص" wide>
            <textarea rows={3} maxLength={600} value={body} onChange={(e) => setBody(e.target.value)} placeholder="مثال: عطلة رسمية غداً" />
          </Field>
        </div>
        <button type="button" className="btn" disabled={busy || !title.trim() || !body.trim()} onClick={() => void send()}>
          إرسال
        </button>
      </div>
    </section>
  );
}
