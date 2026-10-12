import type { CanonicalStudentId } from './ids';

export type RakazPaymentMethod = 'cash' | 'card' | 'zainCash' | 'bankTransfer';

/** Amounts are whole Iraqi dinars. Dates are epoch ms. */
export interface RakazSubscription {
  id: string;
  studentId: CanonicalStudentId;
  periodTitle: string;
  monthlyFee: number;
  yearlyFee: number | null;
  /** Total amount owed for the period. */
  dueAmount: number;
  /** Sum of recorded payments for the period. */
  paidAmount: number;
  dueDate: number;
}

export interface RakazPayment {
  id: string;
  /** Receipt number shown to the guardian, e.g. TX-100458 */
  code: string;
  studentId: CanonicalStudentId;
  amount: number;
  date: number;
  method: RakazPaymentMethod;
  recordedBy: string;
  note: string;
}

export interface RakazSubscriptionInput {
  periodTitle: string;
  monthlyFee: number;
  yearlyFee: number | null;
  dueAmount: number;
  dueDate: number;
}

export interface RakazPaymentInput {
  amount: number;
  date: number;
  method: RakazPaymentMethod;
  note: string;
}
