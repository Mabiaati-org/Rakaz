import { useEffect, useMemo, useState } from 'react';

import { RAKAZ_CHECKIN_INTERVAL_SECONDS, todayISO, type RakazAdminCheckin } from '@rakaz/contract';

import { FleetMap, type FleetBus } from '@/components/maps';
import { DataState, formatTime, PageHead } from '@/components/ui';
import { useAsyncData } from '@/hooks/useAsyncData';
import { adminApi } from '@/services/adminApi';

const REFRESH_MS = 60_000;
const osmLink = (c: RakazAdminCheckin): string =>
  `https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=17/${c.latitude}/${c.longitude}`;

/** Where each driver was every five minutes on duty, and who was on the bus at that moment. */
export function CheckinsPage() {
  const today = todayISO();
  const [dateISO, setDateISO] = useState(today);
  const [driverUid, setDriverUid] = useState('');
  const drivers = useAsyncData(() => adminApi.listDrivers());
  const { data, error, loading, reload } = useAsyncData(
    () => adminApi.listCheckins({ dateISO, driverUid: driverUid || undefined }),
    [dateISO, driverUid],
  );

  // Today's list grows as drivers report, so keep it fresh while the page is open.
  useEffect(() => {
    if (dateISO !== today) return;
    const timer = setInterval(reload, REFRESH_MS);
    return () => clearInterval(timer);
  }, [dateISO, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkins = useMemo(() => data ?? [], [data]);

  // With one driver selected the map shows that driver's trail; otherwise each driver's latest position.
  const points: FleetBus[] = useMemo(() => {
    const shown = driverUid ? checkins : checkins.filter((c, i) => checkins.findIndex((o) => o.driverUid === c.driverUid) === i);
    return shown.map((c, i) => ({
      id: c.id,
      label: `${c.driverName} · ${formatTime(c.at)}`,
      position: { latitude: c.latitude, longitude: c.longitude },
      moving: c.passengers.length > 0,
      highlighted: driverUid ? i === 0 : undefined,
    }));
  }, [checkins, driverUid]);

  return (
    <section>
      <PageHead
        title="مواقع السائقين"
        subtitle={`يرسل تطبيق السائق موقعه ومن معه كل ${RAKAZ_CHECKIN_INTERVAL_SECONDS / 60} دقائق خلال وقت الدوام.`}
      >
        <select className="cell-input" value={driverUid} onChange={(e) => setDriverUid(e.target.value)}>
          <option value="">كل السائقين</option>
          {(drivers.data ?? []).map((d) => (
            <option key={d.uid} value={d.uid}>
              {d.name} — {d.vehicleLabel}
            </option>
          ))}
        </select>
        <input className="cell-input" type="date" max={today} value={dateISO} onChange={(e) => setDateISO(e.target.value || today)} />
        <button type="button" className="btn secondary" onClick={reload}>
          تحديث
        </button>
      </PageHead>

      {points.length > 0 ? (
        <div className="card">
          <h2>{driverUid ? 'مسار السائق خلال اليوم' : 'آخر موقع لكل سائق'}</h2>
          <FleetMap buses={points} />
        </div>
      ) : null}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>الوقت</th>
              <th>السائق</th>
              <th>العنوان</th>
              <th>الإحداثيات</th>
              <th>معه في الباص</th>
            </tr>
          </thead>
          <tbody>
            {checkins.map((c) => (
              <tr key={c.id}>
                <td>{formatTime(c.at)}</td>
                <td>
                  {c.driverName}
                  <div className="muted small">
                    {c.vehicleLabel}
                    {c.routeId ? ` · ${c.routeId}` : ''}
                  </div>
                </td>
                <td className="wrap">{c.address ?? '—'}</td>
                <td dir="ltr">
                  <a className="link" href={osmLink(c)} target="_blank" rel="noreferrer">
                    {c.latitude}, {c.longitude}
                  </a>
                  {c.accuracy != null ? <div className="muted small">± {Math.round(c.accuracy)} m</div> : null}
                </td>
                <td className="wrap">
                  {c.passengers.length === 0 ? (
                    <span className="badge idle">لا أحد</span>
                  ) : (
                    <>
                      <span className="badge live">{c.passengers.length}</span> {c.passengers.map((p) => p.name).join('، ')}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <DataState loading={loading} error={error} empty={checkins.length === 0} />
      </div>
    </section>
  );
}
