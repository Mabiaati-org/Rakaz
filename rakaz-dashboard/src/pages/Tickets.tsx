import { useState } from 'react';

import { formatIraqiPhoneLocal, type RakazSupportTicket, type RakazTicketStatus, type RakazTicketTopic } from '@rakaz/contract';

import { DataState, Field, formatDateTime, Notice, PageHead } from '@/components/ui';
import { useAction, useAsyncData } from '@/hooks/useAsyncData';
import { adminApi } from '@/services/adminApi';

const statusLabel: Record<RakazTicketStatus, string> = { open: 'جديدة', inReview: 'قيد المراجعة', resolved: 'مغلقة' };
const statusBadge: Record<RakazTicketStatus, string> = { open: 'warn', inReview: 'idle', resolved: 'live' };
const topicLabel: Record<RakazTicketTopic, string> = {
  driver: 'السائق',
  timing: 'المواعيد',
  vehicle: 'المركبة',
  payment: 'المدفوعات',
  app: 'التطبيق',
  other: 'أخرى',
};

export function TicketsPage() {
  const { data, error, loading, reload } = useAsyncData(() => adminApi.listTickets());
  const [active, setActive] = useState<RakazSupportTicket | null>(null);
  const [status, setStatus] = useState<RakazTicketStatus>('inReview');
  const [reply, setReply] = useState('');
  const { busy, notice, run } = useAction();

  const open = (t: RakazSupportTicket): void => {
    setActive(t);
    setStatus(t.status === 'open' ? 'inReview' : t.status);
    setReply(t.adminReply ?? '');
  };

  const save = (): Promise<boolean> =>
    run(async () => {
      if (!active) return;
      await adminApi.updateTicket(active.id, { status, adminReply: reply.trim() || null });
      setActive(null);
      reload();
      return 'تم تحديث التذكرة وإشعار صاحبها';
    });

  return (
    <section>
      <PageHead title="الدعم" subtitle="شكاوى وملاحظات أولياء الأمور من التطبيق." />
      <Notice notice={notice} />

      {active ? (
        <div className="card">
          <div className="card-head">
            <h2>
              {active.kind === 'complaint' ? 'شكوى' : 'ملاحظة'} <code>{active.code}</code>
            </h2>
            <button type="button" className="btn secondary" onClick={() => setActive(null)}>
              إغلاق
            </button>
          </div>
          <p className="muted">
            {active.authorName} · <span dir="ltr">{formatIraqiPhoneLocal(active.authorPhone ?? '')}</span> · {topicLabel[active.topic]} · {formatDateTime(active.createdAt)}
          </p>
          <p className="ticket-body">{active.body}</p>
          <div className="form-grid">
            <Field label="الحالة">
              <select value={status} onChange={(e) => setStatus(e.target.value as RakazTicketStatus)}>
                {Object.entries(statusLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="الرد (يصل لصاحب التذكرة كإشعار)" wide>
              <textarea rows={3} maxLength={1000} value={reply} onChange={(e) => setReply(e.target.value)} />
            </Field>
          </div>
          <button type="button" className="btn" disabled={busy} onClick={() => void save()}>
            حفظ
          </button>
        </div>
      ) : null}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>الرقم</th>
              <th>النوع</th>
              <th>الموضوع</th>
              <th>المرسل</th>
              <th>النص</th>
              <th>التاريخ</th>
              <th>الحالة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((t) => (
              <tr key={t.id}>
                <td>
                  <code>{t.code}</code>
                </td>
                <td>{t.kind === 'complaint' ? 'شكوى' : 'ملاحظة'}</td>
                <td>{topicLabel[t.topic]}</td>
                <td>{t.authorName}</td>
                <td className="truncate">{t.body}</td>
                <td>{formatDateTime(t.createdAt)}</td>
                <td>
                  <span className={`badge ${statusBadge[t.status]}`}>{statusLabel[t.status]}</span>
                </td>
                <td className="row-actions">
                  <button type="button" className="btn secondary" onClick={() => open(t)}>
                    فتح
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
