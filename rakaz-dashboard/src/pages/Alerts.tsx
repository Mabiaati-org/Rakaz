import { formatDateTime, PageHead } from '@/components/ui';
import { alerts, useAlerts } from '@/hooks/useAlerts';

export function AlertsPage() {
  const { items, unread, error } = useAlerts();

  return (
    <section>
      <PageHead title="التنبيهات" subtitle="بلاغات الطوارئ، مشاكل الاستلام، تغيير العناوين وطلبات الدعم الجديدة. تتحدث كل نصف دقيقة.">
        <button type="button" className="btn secondary" onClick={() => void alerts.refresh()}>
          تحديث
        </button>
        <button type="button" className="btn" disabled={unread === 0} onClick={() => void alerts.markAllRead()}>
          تعليم الكل كمقروء
        </button>
      </PageHead>
      {error ? <div className="alert error">تعذّر تحديث التنبيهات. تُعرض آخر نسخة محمّلة.</div> : null}

      <div className="card">
        {items.length === 0 ? <div className="empty">لا توجد تنبيهات</div> : null}
        <ul className="alert-list">
          {items.map((n) => (
            <li key={n.id} className={n.read ? 'read' : 'unread'}>
              <div className="alert-head">
                <strong>
                  {n.kind === 'emergency' ? <span className="badge danger">طارئ</span> : null} {n.title}
                </strong>
                <span className="muted">{formatDateTime(n.at)}</span>
              </div>
              <p>{n.body}</p>
              {n.read ? null : (
                <button type="button" className="btn secondary" onClick={() => void alerts.markRead(n.id)}>
                  تم الاطلاع
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
