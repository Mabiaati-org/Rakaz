import type { NotificationKind, TripKind } from '../../generated/prisma/client.js';

/** Arabic copy for the notifications guardians receive as a trip progresses. */
export function tripNotificationText(
  kind: NotificationKind,
  studentName: string,
  tripKind: TripKind,
): { title: string; body: string } {
  switch (kind) {
    case 'TRIP_STARTED':
      return { title: 'انطلقت رحلة الصباح', body: `الباص في الطريق لاستلام ${studentName}.` };
    case 'RETURN_STARTED':
      return { title: 'انطلقت رحلة العودة', body: `${studentName} في الباص بطريق العودة إلى المنزل.` };
    case 'DRIVER_NEAR':
      return tripKind === 'MORNING'
        ? { title: 'الباص وصل', body: `الباص وصل إلى نقطة استلام ${studentName}.` }
        : { title: 'الباص وصل', body: `الباص وصل إلى منزل ${studentName}.` };
    case 'PICKED_UP':
      return { title: 'تم استلام الطالب', body: `صعد ${studentName} إلى الباص.` };
    case 'ARRIVED_SCHOOL':
      return { title: 'الوصول إلى المدرسة', body: `وصل ${studentName} إلى المدرسة.` };
    case 'DELIVERED':
      return { title: 'تم تسليم الطالب', body: `وصل ${studentName} إلى المنزل. يرجى تأكيد الاستلام.` };
    case 'DELAY':
      return {
        title: 'تنبيه من السائق',
        body: 'أبلغ السائق عن حالة طارئة وقد تتأخر الرحلة. ستتواصل معكم الإدارة عند الحاجة.',
      };
    case 'ADMIN':
      return { title: 'تسجيل غياب', body: `سجّل السائق ${studentName} غائباً عن الرحلة.` };
    default:
      return { title: 'ركاز', body: '' };
  }
}
