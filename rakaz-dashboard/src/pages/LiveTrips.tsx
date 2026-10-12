import { useEffect, useState } from 'react';

import type { RakazAdminTrip, RakazStopStatus, RakazTripPhase } from '@rakaz/contract';

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

const mapsLink = (lat: number, lng: number): string => `https://www.google.com/maps?q=${lat},${lng}`;

export function LiveTripsPage() {
  const [trips, setTrips] = useState<RakazAdminTrip[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      adminApi.watchLiveTrips(
        (next) => {
          setTrips(next);
          setError(null);
        },
        (err) => setError(`انقطع البث الحي، جارٍ إعادة الاتصال… (${errorText(err)})`),
      ),
    [],
  );

  return (
    <section>
      <PageHead title="الرحلات الحية" subtitle="رحلات اليوم تتحدث تلقائياً مع كل حدث من السائق." />
      {error ? <div className="alert error">{error}</div> : null}
      {trips === null && !error ? <div className="card empty">جارٍ الاتصال…</div> : null}
      {trips?.length === 0 ? <div className="card empty">لا توجد رحلات اليوم بعد. تبدأ الرحلة عند أول حدث من السائق.</div> : null}

      {(trips ?? []).map((trip) => (
        <div className="card" key={trip.tripId}>
          <div className="card-head">
            <h2>
              {trip.routeName} · {trip.tripKind === 'morning' ? 'ذهاب' : 'عودة'}
            </h2>
            <span className={`badge ${trip.phase === 'inProgress' ? 'live' : 'idle'}`}>{phaseLabel[trip.phase]}</span>
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
                  موقع الباص{trip.busUpdatedAt ? ` (${formatTime(trip.busUpdatedAt)})` : ''}
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
        </div>
      ))}
    </section>
  );
}
