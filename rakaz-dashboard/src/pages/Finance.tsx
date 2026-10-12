import { useState } from 'react';

import { formatIraqiPhoneLocal, type RakazAdminFinanceRow, type RakazPaymentInput, type RakazPaymentMethod, type RakazSubscriptionInput } from '@rakaz/contract';

import { DataState, Field, formatDate, formatMoney, fromDateInput, Notice, PageHead, toDateInput } from '@/components/ui';
import { useAction, useAsyncData } from '@/hooks/useAsyncData';
import { adminApi } from '@/services/adminApi';

const methodLabel: Record<RakazPaymentMethod, string> = {
  cash: 'نقداً',
  card: 'بطاقة',
  zainCash: 'زين كاش',
  bankTransfer: 'تحويل مصرفي',
};

const DAY = 86_400_000;

function subscriptionDraft(row: RakazAdminFinanceRow): RakazSubscriptionInput {
  const s = row.subscription;
  return s
    ? { periodTitle: s.periodTitle, monthlyFee: s.monthlyFee, yearlyFee: s.yearlyFee, dueAmount: s.dueAmount, dueDate: s.dueDate }
    : { periodTitle: '', monthlyFee: 0, yearlyFee: null, dueAmount: 0, dueDate: Date.now() + 30 * DAY };
}

const paymentDraft = (): RakazPaymentInput => ({ amount: 0, date: Date.now(), method: 'cash', note: '' });

export function FinancePage() {
  const { data, error, loading, reload } = useAsyncData(() => adminApi.listFinance());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<RakazSubscriptionInput | null>(null);
  const [payment, setPayment] = useState<RakazPaymentInput>(paymentDraft());
  const { busy, notice, run } = useAction();

  const selected = data?.find((r) => r.studentId === selectedId) ?? null;
  const open = (row: RakazAdminFinanceRow): void => {
    setSelectedId(row.studentId);
    setSubscription(subscriptionDraft(row));
    setPayment(paymentDraft());
  };

  const saveSubscription = (): Promise<boolean> =>
    run(async () => {
      if (!selected || !subscription) return;
      await adminApi.saveSubscription(selected.studentId, subscription);
      reload();
      return 'تم حفظ الاشتراك';
    });

  const recordPayment = (): Promise<boolean> =>
    run(async () => {
      if (!selected) return;
      const saved = await adminApi.recordPayment(selected.studentId, payment);
      setPayment(paymentDraft());
      reload();
      return `سُجّلت الدفعة — إيصال ${saved.code}`;
    });

  return (
    <section>
      <PageHead title="المالية" subtitle="الاشتراكات والدفعات المسجّلة. يراها ولي الأمر في تطبيقه للقراءة فقط." />
      <Notice notice={notice} />

      {selected && subscription ? (
        <div className="card">
          <div className="card-head">
            <h2>
              {selected.studentName} <code>{selected.studentId}</code>
            </h2>
            <button type="button" className="btn secondary" onClick={() => setSelectedId(null)}>
              إغلاق
            </button>
          </div>

          <h3>الاشتراك</h3>
          <div className="form-grid">
            <Field label="الفترة">
              <input value={subscription.periodTitle} placeholder="العام الدراسي 2026 - 2027" onChange={(e) => setSubscription({ ...subscription, periodTitle: e.target.value })} />
            </Field>
            <Field label="القسط الشهري (د.ع)">
              <input dir="ltr" type="number" min={0} value={subscription.monthlyFee} onChange={(e) => setSubscription({ ...subscription, monthlyFee: Number(e.target.value) })} />
            </Field>
            <Field label="القسط السنوي (د.ع) — اختياري">
              <input dir="ltr" type="number" min={0} value={subscription.yearlyFee ?? ''} onChange={(e) => setSubscription({ ...subscription, yearlyFee: e.target.value ? Number(e.target.value) : null })} />
            </Field>
            <Field label="إجمالي المستحق (د.ع)">
              <input dir="ltr" type="number" min={0} value={subscription.dueAmount} onChange={(e) => setSubscription({ ...subscription, dueAmount: Number(e.target.value) })} />
            </Field>
            <Field label="تاريخ الاستحقاق">
              <input type="date" value={toDateInput(subscription.dueDate)} onChange={(e) => e.target.value && setSubscription({ ...subscription, dueDate: fromDateInput(e.target.value) })} />
            </Field>
          </div>
          <button type="button" className="btn" disabled={busy || subscription.periodTitle.trim().length < 2} onClick={() => void saveSubscription()}>
            حفظ الاشتراك
          </button>

          <h3>تسجيل دفعة</h3>
          {selected.subscription ? (
            <>
              <div className="form-grid">
                <Field label="المبلغ (د.ع)">
                  <input dir="ltr" type="number" min={1} value={payment.amount || ''} onChange={(e) => setPayment({ ...payment, amount: Number(e.target.value) })} />
                </Field>
                <Field label="التاريخ">
                  <input type="date" value={toDateInput(payment.date)} onChange={(e) => e.target.value && setPayment({ ...payment, date: fromDateInput(e.target.value) })} />
                </Field>
                <Field label="طريقة الدفع">
                  <select value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value as RakazPaymentMethod })}>
                    {Object.entries(methodLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="ملاحظة">
                  <input value={payment.note} onChange={(e) => setPayment({ ...payment, note: e.target.value })} />
                </Field>
              </div>
              <button type="button" className="btn" disabled={busy || payment.amount < 1} onClick={() => void recordPayment()}>
                تسجيل الدفعة
              </button>
            </>
          ) : (
            <p className="muted">احفظ الاشتراك أولاً لتتمكن من تسجيل الدفعات.</p>
          )}

          {selected.payments.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>الإيصال</th>
                    <th>المبلغ</th>
                    <th>التاريخ</th>
                    <th>الطريقة</th>
                    <th>سجّلها</th>
                    <th>ملاحظة</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.payments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <code>{p.code}</code>
                      </td>
                      <td>{formatMoney(p.amount)}</td>
                      <td>{formatDate(p.date)}</td>
                      <td>{methodLabel[p.method]}</td>
                      <td>{p.recordedBy}</td>
                      <td>{p.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>الطالب</th>
              <th>ولي الأمر</th>
              <th>الفترة</th>
              <th>المستحق</th>
              <th>المدفوع</th>
              <th>المتبقي</th>
              <th>الاستحقاق</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((row) => {
              const s = row.subscription;
              const remaining = s ? Math.max(0, s.dueAmount - s.paidAmount) : 0;
              const overdue = s !== null && remaining > 0 && s.dueDate < Date.now();
              return (
                <tr key={row.studentId}>
                  <td>
                    {row.studentName} <code>{row.studentId}</code>
                  </td>
                  <td>
                    {row.guardianName} <span dir="ltr">{formatIraqiPhoneLocal(row.guardianPhone)}</span>
                  </td>
                  <td>{s?.periodTitle ?? <span className="badge idle">بلا اشتراك</span>}</td>
                  <td>{s ? formatMoney(s.dueAmount) : '—'}</td>
                  <td>{s ? formatMoney(s.paidAmount) : '—'}</td>
                  <td>{s ? <span className={`badge ${remaining === 0 ? 'live' : overdue ? 'danger' : 'warn'}`}>{formatMoney(remaining)}</span> : '—'}</td>
                  <td>{s ? formatDate(s.dueDate) : '—'}</td>
                  <td className="row-actions">
                    <button type="button" className="btn secondary" onClick={() => open(row)}>
                      إدارة
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <DataState loading={loading} error={error} empty={!data?.length} />
      </div>
    </section>
  );
}
