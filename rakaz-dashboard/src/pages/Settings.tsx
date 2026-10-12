import { useEffect, useState } from 'react';

import { formatIraqiPhoneLocal, type RakazSupportContact } from '@rakaz/contract';

import { Field, Notice, PageHead } from '@/components/ui';
import { useAction, useAsyncData } from '@/hooks/useAsyncData';
import { adminApi } from '@/services/adminApi';

export function SettingsPage() {
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
      return 'تم حفظ الإعدادات';
    });

  return (
    <section>
      <PageHead title="الإعدادات" subtitle="بيانات التواصل التي تظهر في تطبيقي السائق وولي الأمر." />
      <Notice notice={notice} />
      {error ? <div className="alert error">{error}</div> : null}
      {draft ? (
        <div className="card" style={{ maxWidth: 560 }}>
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
        </div>
      ) : null}
    </section>
  );
}
