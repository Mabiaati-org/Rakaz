import { useEffect, useState } from 'react';

import { formatIraqiPhoneLocal, type RakazSupportContact, type RakazWorkSchedule } from '@rakaz/contract';

import { Field, Notice, PageHead } from '@/components/ui';
import { useAction, useAsyncData } from '@/hooks/useAsyncData';
import { adminApi } from '@/services/adminApi';

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function ContactCard() {
  const { data, error } = useAsyncData(() => adminApi.getSettings());
  const [draft, setDraft] = useState<RakazSupportContact | null>(null);
  const { busy, notice, run } = useAction();

  useEffect(() => {
    if (data) setDraft({ ...data, adminPhone: data.adminPhone ? formatIraqiPhoneLocal(data.adminPhone) : '' });
  }, [data]);

  const save = (): Promise<boolean> =>
    run(async () => {
      if (!draft) return;
      await adminApi.saveSettings(draft);
      return 'تم حفظ بيانات التواصل';
    });

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <h2>بيانات التواصل</h2>
      <p className="muted">تظهر في تطبيقي السائق وولي الأمر.</p>
      <Notice notice={notice} />
      {error ? <div className="alert error">{error}</div> : null}
      {draft ? (
        <>
          <div className="form-grid single">
            <Field label="هاتف الإدارة (زر الاتصال في التطبيقين)">
              <input dir="ltr" inputMode="tel" placeholder="07XXXXXXXXX" value={draft.adminPhone} onChange={(e) => setDraft({ ...draft, adminPhone: e.target.value })} />
            </Field>
            <Field label="رقم واتساب الدعم (أرقام فقط مع رمز الدولة)">
              <input dir="ltr" inputMode="numeric" placeholder="9647XXXXXXXXX" value={draft.whatsappNumber} onChange={(e) => setDraft({ ...draft, whatsappNumber: e.target.value })} />
            </Field>
            <Field label="رابط سياسة الخصوصية">
              <input dir="ltr" type="url" placeholder="https://…/privacy.html" value={draft.privacyPolicyUrl} onChange={(e) => setDraft({ ...draft, privacyPolicyUrl: e.target.value })} />
            </Field>
          </div>
          <button type="button" className="btn" disabled={busy} onClick={() => void save()}>
            حفظ
          </button>
        </>
      ) : null}
    </div>
  );
}

function WorkScheduleCard() {
  const { data, error } = useAsyncData(() => adminApi.getWorkSchedule());
  const [draft, setDraft] = useState<RakazWorkSchedule | null>(null);
  const { busy, notice, run } = useAction();

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const toggle = (day: number): void => {
    if (!draft) return;
    const days = draft.days.includes(day) ? draft.days.filter((d) => d !== day) : [...draft.days, day].sort();
    setDraft({ ...draft, days });
  };

  const save = (): Promise<boolean> =>
    run(async () => {
      if (!draft) return;
      setDraft(await adminApi.saveWorkSchedule(draft));
      return 'تم حفظ وقت الدوام';
    });

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <h2>وقت دوام السائقين</h2>
      <p className="muted">خلال هذا الوقت فقط يسجّل تطبيق السائق موقعه ومن معه كل ٥ دقائق. خارجه يرفض الخادم التسجيل.</p>
      <Notice notice={notice} />
      {error ? <div className="alert error">{error}</div> : null}
      {draft ? (
        <>
          <div className="form-grid">
            <Field label="من">
              <input type="time" value={draft.startTime} onChange={(e) => e.target.value && setDraft({ ...draft, startTime: e.target.value })} />
            </Field>
            <Field label="إلى">
              <input type="time" value={draft.endTime} onChange={(e) => e.target.value && setDraft({ ...draft, endTime: e.target.value })} />
            </Field>
          </div>
          <div className="day-row" role="group" aria-label="أيام الدوام">
            {DAYS.map((label, day) => (
              <label key={label} className={`day-chip ${draft.days.includes(day) ? 'on' : ''}`}>
                <input type="checkbox" checked={draft.days.includes(day)} onChange={() => toggle(day)} />
                {label}
              </label>
            ))}
          </div>
          <button type="button" className="btn" disabled={busy} onClick={() => void save()}>
            حفظ
          </button>
        </>
      ) : null}
    </div>
  );
}

export function SettingsPage() {
  return (
    <section>
      <PageHead title="الإعدادات" />
      <ContactCard />
      <WorkScheduleCard />
    </section>
  );
}
