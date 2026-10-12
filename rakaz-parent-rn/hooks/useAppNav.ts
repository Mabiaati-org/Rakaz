import { type Href, useRouter } from 'expo-router';
import { useMemo } from 'react';

import type { AppTab } from '@/components/TabBar';
import { TripKind } from '@/types/models';
import { Haptics } from '@/utils/haptics';

const TAB_HREF: Record<AppTab, Href> = {
  index: '/',
  trips: '/trips',
  family: '/family',
  support: '/support',
};

/** Navigation entry points mirroring `FamilyStore.open(_:)`, `tab =` and `showNotifications = true`. */
export function useAppNav() {
  const router = useRouter();
  return useMemo(() => {
    const push = (href: Href) => {
      Haptics.tap();
      router.push(href);
    };
    return {
      /** Switches the root tab, closing any pushed screens first (pushed screens hide the tab bar). */
      openTab(tab: AppTab): void {
        if (router.canDismiss()) router.dismissAll();
        router.navigate(TAB_HREF[tab]);
      },
      showNotifications(): void {
        router.push({ pathname: '/notifications', params: { sheet: '1' } });
      },
      student(id: string): void {
        push({ pathname: '/student/[id]', params: { id } });
      },
      address(id: string): void {
        push({ pathname: '/address/[id]', params: { id } });
      },
      school(): void {
        push('/school');
      },
      driver(): void {
        push('/driver');
      },
      absences(): void {
        push('/absences');
      },
      notificationSettings(): void {
        push('/notification-settings');
      },
      changePassword(): void {
        push('/change-password');
      },
      deleteAccount(): void {
        push('/delete-account');
      },
      notifications(): void {
        push('/notifications');
      },
      finance(): void {
        push('/finance');
      },
      liveTrip(kind: TripKind): void {
        push({ pathname: '/trip/[kind]', params: { kind } });
      },
      reportAbsence(): void {
        router.push('/report-absence');
      },
      composeTicket(kind: 'complaint' | 'feedback'): void {
        router.push({ pathname: '/ticket/[kind]', params: { kind } });
      },
    };
  }, [router]);
}

export function parseTripKind(value: string | string[] | undefined): TripKind {
  return value === TripKind.afternoon ? TripKind.afternoon : TripKind.morning;
}
