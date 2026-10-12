import { Injectable } from '@nestjs/common';
import type {
  RakazAdminFinanceRow,
  RakazPayment,
  RakazPaymentInput,
  RakazSubscription,
  RakazSubscriptionInput,
} from '@rakaz/contract';

import { ApiError } from '../../common/api-error.js';
import type { AuthUser } from '../../common/auth-user.js';
import { paymentMethodMap } from '../../common/mappers.js';
import { Prisma, type Payment } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

const subscriptionInclude = {
  payments: { where: { deletedAt: null }, orderBy: { paidAt: 'desc' } },
} satisfies Prisma.SubscriptionInclude;
type SubscriptionRow = Prisma.SubscriptionGetPayload<{ include: typeof subscriptionInclude }>;

const FIRST_RECEIPT_NUMBER = 100001;
const dinars = (amount: number): string => `${amount.toLocaleString('en-US')} د.ع`;

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private paymentToWire(p: Payment, studentCode: string): RakazPayment {
    return {
      id: p.id,
      code: p.code,
      studentId: studentCode,
      amount: p.amount,
      date: p.paidAt.getTime(),
      method: paymentMethodMap.toWire(p.method),
      recordedBy: p.recordedByName,
      note: p.note,
    };
  }

  private subscriptionToWire(s: SubscriptionRow, studentCode: string): RakazSubscription {
    return {
      id: s.id,
      studentId: studentCode,
      periodTitle: s.periodTitle,
      monthlyFee: s.monthlyFee,
      yearlyFee: s.yearlyFee,
      dueAmount: s.dueAmount,
      paidAmount: s.payments.reduce((sum, p) => sum + p.amount, 0),
      dueDate: s.dueDate.getTime(),
    };
  }

  /** The active subscription and its payments for each given student (keyed by internal student id). */
  async forStudents(
    students: Array<{ id: string; code: string }>,
  ): Promise<Map<string, { subscription: RakazSubscription | null; payments: RakazPayment[] }>> {
    const rows = await this.prisma.subscription.findMany({
      where: { studentId: { in: students.map((s) => s.id) }, active: true, deletedAt: null },
      include: subscriptionInclude,
    });
    const byStudent = new Map(rows.map((r) => [r.studentId, r]));
    return new Map(
      students.map((student) => {
        const row = byStudent.get(student.id);
        return [
          student.id,
          {
            subscription: row ? this.subscriptionToWire(row, student.code) : null,
            payments: row ? row.payments.map((p) => this.paymentToWire(p, student.code)) : [],
          },
        ];
      }),
    );
  }

  async listForAdmin(): Promise<RakazAdminFinanceRow[]> {
    const students = await this.prisma.student.findMany({ where: { deletedAt: null }, orderBy: { code: 'asc' } });
    const finance = await this.forStudents(students);
    return students.map((s) => ({
      studentId: s.code,
      studentName: s.fullName,
      guardianName: s.guardianName,
      guardianPhone: s.guardianPhone,
      subscription: finance.get(s.id)?.subscription ?? null,
      payments: finance.get(s.id)?.payments ?? [],
    }));
  }

  /** Each student has one active subscription; saving edits it or creates the first one. */
  async saveSubscription(studentCode: string, input: RakazSubscriptionInput): Promise<RakazSubscription> {
    const student = await this.prisma.student.findFirst({ where: { code: studentCode, deletedAt: null } });
    if (!student) throw ApiError.notFound('الطالب غير موجود');

    const data = {
      periodTitle: input.periodTitle,
      monthlyFee: input.monthlyFee,
      yearlyFee: input.yearlyFee,
      dueAmount: input.dueAmount,
      dueDate: new Date(input.dueDate),
    };
    const active = await this.prisma.subscription.findFirst({
      where: { studentId: student.id, active: true, deletedAt: null },
    });
    const saved = active
      ? await this.prisma.subscription.update({ where: { id: active.id }, data, include: subscriptionInclude })
      : await this.prisma.subscription.create({ data: { ...data, studentId: student.id }, include: subscriptionInclude });
    return this.subscriptionToWire(saved, student.code);
  }

  async recordPayment(admin: AuthUser, studentCode: string, input: RakazPaymentInput): Promise<RakazPayment> {
    const student = await this.prisma.student.findFirst({ where: { code: studentCode, deletedAt: null } });
    if (!student) throw ApiError.notFound('الطالب غير موجود');
    const subscription = await this.prisma.subscription.findFirst({
      where: { studentId: student.id, active: true, deletedAt: null },
    });
    if (!subscription) throw ApiError.conflict('أضف اشتراكاً للطالب قبل تسجيل دفعة');

    const payment = await this.createWithNextCode({
      subscriptionId: subscription.id,
      studentId: student.id,
      amount: input.amount,
      paidAt: new Date(input.date),
      method: paymentMethodMap.toDb(input.method),
      note: input.note,
      recordedById: admin.id,
      recordedByName: admin.name,
    });

    await this.notifications.notifyUsers([student.guardianId], {
      kind: 'PAYMENT',
      title: 'تم تسجيل دفعة',
      body: `سُجّلت دفعة بمبلغ ${dinars(input.amount)} لاشتراك ${student.firstName} (إيصال ${payment.code}).`,
      studentCode: student.code,
    });
    return this.paymentToWire(payment, student.code);
  }

  /** Receipt numbers are sequential; retry when two payments race for the same number. */
  private async createWithNextCode(data: Omit<Prisma.PaymentUncheckedCreateInput, 'code'>): Promise<Payment> {
    for (let attempt = 0; ; attempt++) {
      const count = await this.prisma.payment.count();
      try {
        return await this.prisma.payment.create({ data: { ...data, code: `TX-${FIRST_RECEIPT_NUMBER + count + attempt}` } });
      } catch (error) {
        const duplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
        if (!duplicate || attempt >= 5) throw error;
      }
    }
  }
}
