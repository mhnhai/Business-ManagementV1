import { isNonEmptyString, isNumber, isUnsignedInteger } from 'jet-validators';
import { parseObject, Schema, testObject } from 'jet-validators/utils';

import type { PaymentStatusCode } from '@src/common/constants/payment-status';
import { transformIsDate } from '@src/common/utils/validators';
import { Entity } from './common/types';

/**
 * @entity payments
 */
export interface IPayment extends Entity {
  activityId: number;
  paidAmount: number;
  paymentDate: Date;
  method: string;
}

export interface IPaymentRecordInput {
  paidAmount: number;
  method: string;
  paymentDate?: Date | string;
  applyCustomerBalance?: boolean;
}

export interface IPaymentSummary {
  activityId: number;
  invoiceTotal: number;
  paidTotal: number;
  remaining: number;
  customerBalance: number;
  /** Tổng nợ tích lũy (mọi đơn có HĐ của khách). */
  customerTotalDebt: number;
  /** Nợ các đơn khác (không tính phần còn lại của đơn hiện tại). */
  customerDebtOtherOrders: number;
  paymentStatus: PaymentStatusCode;
  paymentStatusLabel: string;
  canRecordPayment: boolean;
  /** Đang xử lý: thanh toán chỉ lưu khi hoàn thành đơn */
  paymentsDeferred?: boolean;
  payments: IPayment[];
}

const GetDefaults = (): IPayment => ({
  id: 0,
  activityId: 0,
  paidAmount: 0,
  paymentDate: new Date(),
  method: '',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const schema = {
  id: isUnsignedInteger,
  activityId: isUnsignedInteger,
  paidAmount: isNumber,
  paymentDate: transformIsDate,
  method: isNonEmptyString,
  createdAt: transformIsDate,
  updatedAt: transformIsDate,
} satisfies Schema<IPayment>;

const parsePayment = parseObject(schema);

const isCompletePayment = testObject<IPayment>({
  ...schema,
  activityId: isUnsignedInteger,
  paidAmount: isNumber,
  method: isNonEmptyString,
});

function isCompleteRecordInput(v: unknown): v is IPaymentRecordInput {
  const p = v as IPaymentRecordInput;
  return (
    typeof p?.paidAmount === 'number' &&
    p.paidAmount > 0 &&
    typeof p?.method === 'string' &&
    p.method.trim().length > 0
  );
}

function new_(payment?: Partial<IPayment>): IPayment {
  return parsePayment({ ...GetDefaults(), ...payment }, (errors) => {
    throw new Error(
      'Setup new payment failed ' + JSON.stringify(errors, null, 2),
    );
  });
}

export default {
  new: new_,
  isComplete: isCompletePayment,
  isCompleteRecordInput,
} as const;
