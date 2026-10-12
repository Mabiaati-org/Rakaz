import { useEffect, useState } from 'react';

import {
  RakazActionKind,
  todayISO,
  type RakazAdminTrip,
  type RakazStopStatus,
  type RakazTripEvent,
  type RakazTripPhase,
} from '@rakaz/contract';

import { FleetMap, type FleetBus } from '@/components/maps';
import { formatTime, PageHead } from '@/components/ui';
import { adminApi } from '@/services/adminApi';
import { errorText } from '@/services/client';

const phaseLabel: Record<RakazTripPhase, string> = {
  notStarted: 'لم تبدأ',
  inProgress: 'جارية',
  atSchool: 'وصلت المدرسة',
  finished: 'انتهت',
};

const stopLabel: Record<RakazStopStatus, string> = {
  pending: 'بالانتظار',
  arrived: 'الباص عند المحطة',
  pickedUp: 'في الباص',
  absent: 'غائب',
  droppedOff: 'تم التوصيل',
};

const stopBadge: Record<RakazStopStatus, string> = {
  pending: 'idle',
  arrived: 'warn',
  pickedUp: 'live',
  absent: 'danger',
  droppedOff: 'live',
};

const actionLabel: Record<RakazActionKind, string> = {
  [RakazActionKind.START_TRIP]: 'بدء الرحلة',
  [RakazActionKind.ARRIVED_AT_STOP]: 'الوصول إلى محطة',
  [RakazActionKind.PICKED_UP]: 'استلام طالب',
  [RakazActionKind.MARKED_ABSENT]: 'تسجيل غياب',
  [RakazActionKind.ARRIVED_AT_SCHOOL]: 'الوصول إلى المدرسة',
  [RakazActionKind.START_RETURN]: 'بدء رحلة العودة',
  [RakazActionKind.DROPPED_OFF]: 'تسليم طالب',
  [RakazActionKind.END_TRIP]: 'إنهاء الرحلة',
  [RakazActionKind.EMERGENCY]: 'بلاغ طوارئ',
  [RakazActionKind.REORDER_STOPS]: 'تعديل ترتيب المحطات',
  [RakazActionKind.UNDO_STOP]: 'تراجع عن إجراء',
  [RakazActionKind.EMERGENCY_RESOLVED]: 'انتهاء الطوارئ',
};

const mapsLink = (lat: number, lng: number): string => `https://www.google.com/maps?q=${lat},${lng}`;

/** The driver's actions for one trip, loaded when the admin opens it. */
function EventLog({ trip }: { trip: RakazAdminTrip }) {
  const [events, setEvents] = useState<RakazTripEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const names = new Map(trip.students.map((s) => [s.studentId, s.studentName]));

  // Reload when the trip changes, so an open log follows the live trip.
  useEffect(() => {
    let cancelled = false;
    adminApi
      .listTripEvents(trip.tripId)
      .then((list) => {
        if (!cancelled) setEvents(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorText(err));
      });
    return () => {
      cancelled = true;
    };
  }, [trip.tripId, trip.updatedAt]);

  if (error) return <div className="alert error">{error}</div>;
  if (events === null) return <div className="empty">جارٍ التحميل…</div>;
  if (events.length === 0) return <div className="empty">لا توجد أحداث مسجّلة</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>الوقت</th>
            <th>الإجراء</th>
            <th>الطالب</th>
            <th>التفاصيل</th>
            <th>الموقع</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id}>
              <td>{formatTime(e.at)}</td>
              <td>{actionLabel[e.action] ?? e.action}</td>
              <td>{e.studentId ? (names.get(e.studentId) ?? e.studentId) : '—'}</td>
              <td>{e.action === RakazActionKind.REORDER_STOPS ? '—' : e.detail || '—'}</td>
              <td>
                {e.location ? (
                  <a className="link" href={mapsLink(e.location.latitude, e.location.longitude)} target="_blank" rel="noreferrer">
                    فتح
                  </a>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LiveTripsPage() {
  const today = todayISO();
  const [dateISO, setDateISO] = useState(today);
  const [trips, setTrips] = useState<RakazAdminTrip[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openLog, setOpenLog] = useState<string | null>(null);
  const live = dateISO === today;

  useEffect(() => {
    setTrips(null);
    setError(null);
    if (live) {
      return adminApi.watchLiveTrips(
        (next) => {
          setTrips(next);
          setError(null);
        },
        (err) => setError(`انقطع البث الحي، جارٍ إعادة الاتصال… (${errorText(err)})`),
      );
    }
    let cancelled = false;
    adminApi
      .listTrips(dateISO)
      .then((list) => {
        if (!cancelled) setTrips(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorText(err));
      });
    return () => {
      cancelled = true;
    };
  }, [dateISO, live]);

  const buses: FleetBus[] = live
    ? (trips ?? [])
        .filter((t) => t.busLocation && (t.phase === 'inProgress' || t.phase === 'atSchool'))
        .map((t) => ({
          id: t.tripId,
          label: `${t.vehicleLabel ?? t.routeId} · ${t.routeName}`,
          position: t.busLocation!,
          moving: t.phase === 'inProgress',
        }))
    : [];

  return (
    <section>
      <PageHead
        title={live ? 'الرحلات الحية' : 'سجل الرحلات'}
        subtitle={live ? 'رحلات اليوم تتحدث تلقائياً مع كل حدث من السائق.' : 'رحلات يوم سابق كما سُجّلت.'}
      >
        <input className="cell-input" type="date" max={today} value={dateISO} onChange={(e) => setDateISO(e.target.value || today)} />
        {live ? null : (
          <button type="button" className="btn secondary" onClick={() => setDateISO(today)}>
            اليوم
          </button>
        )}
      </PageHead>
      {error ? <div className="alert error">{error}</div> : null}
      {trips === null && !error ? <div className="card empty">{live ? 'جارٍ الاتصال…' : 'جارٍ التحميل…'}</div> : null}
      {trips?.length === 0 ? (
        <div className="card empty">{live ? 'لا توجد رحلات اليوم بعد. تبدأ الرحلة عند أول حدث من السائق.' : 'لا توجد رحلات مسجّلة في هذا اليوم.'}</div>
      ) : null}

      {buses.length > 0 ? (
        <div className="card">
          <h2>مواقع الحافلات الآن</h2>
          <FleetMap buses={buses} />
        </div>
      ) : null}

      {(trips ?? []).map((trip) => (
        <div className="card" key={trip.tripId}>
          <div className="card-head">
            <h2>
              {trip.routeName} · {trip.tripKind === 'morning' ? 'ذهاب' : 'عودة'}
            </h2>
            <div className="row-actions">
              <span className={`badge ${trip.phase === 'inProgress' ? 'live' : 'idle'}`}>{phaseLabel[trip.phase]}</span>
              <button type="button" className="btn secondary" onClick={() => setOpenLog(openLog === trip.tripId ? null : trip.tripId)}>
                {openLog === trip.tripId ? 'إخفاء السجل' : 'سجل الأحداث'}
              </button>
            </div>
          </div>
          <p className="muted">
            {trip.driverName ?? 'بدون سائق'}
            {trip.vehicleLabel ? ` · ${trip.vehicleLabel}` : ''}
            {trip.startedAt ? ` · بدأت ${formatTime(trip.startedAt)}` : ''}
            {trip.endedAt ? ` · انتهت ${formatTime(trip.endedAt)}` : ''}
            {trip.busLocation ? (
              <>
                {' · '}
                <a className="link" href={mapsLink(trip.busLocation.latitude, trip.busLocation.longitude)} target="_blank" rel="noreferrer">
                  آخر موقع للباص{trip.busUpdatedAt ? ` (${formatTime(trip.busUpdatedAt)})` : ''}
                </a>
              </>
            ) : null}
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>الحالة</th>
                  <th>الوقت</th>
                  <th>تأكيد الاستلام</th>
                </tr>
              </thead>
              <tbody>
                {trip.students.map((s) => (
                  <tr key={s.studentId}>
                    <td>{s.studentName}</td>
                    <td>
                      <span className={`badge ${stopBadge[s.status]}`}>{stopLabel[s.status]}</span>
                    </td>
                    <td>{s.completedAt ? formatTime(s.completedAt) : s.arrivedAt ? formatTime(s.arrivedAt) : '—'}</td>
                    <td>
                      {s.handoverIssue ? (
                        <span className="badge danger">بلاغ مشكلة</span>
                      ) : s.handoverPending ? (
                        <span className="badge warn">بانتظار ولي الأمر</span>
                      ) : s.handoverConfirmedAt ? (
                        <span className="badge live">مؤكد {formatTime(s.handoverConfirmedAt)}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {openLog === trip.tripId ? <EventLog trip={trip} /> : null}
        </div>
      ))}
    </section>
  );
}
