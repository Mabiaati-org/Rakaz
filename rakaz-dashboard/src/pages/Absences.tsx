import { useState } from 'react';

import { todayISO, type RakazAbsenceReport } from '@rakaz/contract';

import { DataState, formatDateTime, PageHead } from '@/components/ui';
import { useAsyncData } from '@/hooks/useAsyncData';
import { adminApi } from '@/services/adminApi';

const scopeLabel: Record<RakazAbsenceReport['scope'], string> = {
  fullDay: 'اليوم كاملاً',
  morningOnly: 'الذهاب فقط',
  returnOnly: 'العودة فقط',
};

const reasonLabel: Record<RakazAbsenceReport['reason'], string> = {
  none: '—',
  sick: 'مرض',
  family: 'ظرف عائلي',
  travel: 'سفر',
  appointment: 'موعد',
  other: 'أخرى',
};

export function AbsencesPage() {
  const [dateISO, setDateISO] = useState(todayISO());
  const { data, error, loading, reload } = useAsyncData(() => adminApi.listAbsences({ dateISO }), [dateISO]);

  return (
    <section>
      <PageHead title="الغياب" subtitle="بلاغات أولياء الأمور. تصل للسائق تلقائياً.">
        <input className="cell-input" type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value || todayISO())} />
        <button type="button" className="btn secondary" onClick={reload}>
          تحديث
        </button>
      </PageHead>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>الطالب</th>
              <th>النطاق</th>
              <th>السبب</th>
              <th>ملاحظة</th>
              <th>وقت البلاغ</th>
              <th>السائق</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((a) => (
              <tr key={a.id}>
                <td>
                  {a.studentName} <code>{a.studentId}</code>
                </td>
                <td>{scopeLabel[a.scope]}</td>
                <td>{reasonLabel[a.reason]}</td>
                <td>{a.note || '—'}</td>
                <td>{formatDateTime(a.createdAt)}</td>
                <td>
                  <span className={`badge ${a.seenByDriverAt ? 'live' : 'idle'}`}>{a.seenByDriverAt ? 'اطّلع' : 'لم يطّلع بعد'}</span>
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
