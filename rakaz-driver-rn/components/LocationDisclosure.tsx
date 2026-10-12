import { useEffect, useState } from 'react';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BusTracking } from '@/services/busTracking';
import { useDriverStore } from '@/store/driverStore';
import { TripPhase } from '@/types/models';

/**
 * Explains background location before the system prompt appears, as Google Play and the
 * App Store require. Shown once per trip start until the driver answers the system prompt.
 */
export function LocationDisclosure() {
  const { state } = useDriverStore();
  const phase = state.trip.phase;
  const running = phase === TripPhase.MORNING_PICKUP || phase === TripPhase.RETURN_TRIP;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    void BusTracking.backgroundPermission().then((status) => {
      if (!cancelled && status === 'undetermined') setVisible(true);
    });
    return () => {
      cancelled = true;
    };
  }, [running]);

  return (
    <ConfirmDialog
      visible={visible}
      title="مشاركة موقع الباص أثناء الرحلة"
      message="يجمع ركاز موقع هذا الهاتف ويرسله للإدارة وأولياء أمور طلاب مسارك حتى يتابعوا الباص، حتى لو كان التطبيق مغلقاً أو الشاشة مقفلة. تبدأ المشاركة عند بدء الرحلة وتتوقف تلقائياً عند انتهائها. في الشاشة التالية اختر «السماح دائماً»."
      confirmTitle="متابعة"
      cancelTitle="ليس الآن"
      onDismiss={() => setVisible(false)}
      onConfirm={() => {
        setVisible(false);
        void BusTracking.requestBackgroundPermission().then((granted) => {
          if (granted) void BusTracking.start(phase === TripPhase.RETURN_TRIP ? 'afternoon' : 'morning');
        });
      }}
    />
  );
}
