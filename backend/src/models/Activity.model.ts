import { isDate, isString, isUnsignedInteger } from 'jet-validators';
import { makeNullable, parseObject, Schema, testObject } from 'jet-validators/utils';
import { PaymentStatuses, type PaymentStatusCode } from '@src/common/constants/payment-status';
import { transformIsDate } from '@src/common/utils/validators';
import { Entity } from './common/types';

function isNullableInvoiceId(val: unknown): val is number | null {
  return val === null || val === undefined || isUnsignedInteger(val);
}

function isPaymentStatusCode(v: unknown): v is PaymentStatusCode {
  return Object.values(PaymentStatuses).includes(v as PaymentStatusCode);
}

function isNullableDeliveryDate(val: unknown): val is Date | null {
  if (val === null || val === undefined) return true;
  if (isDate(val)) return true;
  if (typeof val === 'string' || typeof val === 'number') {
    return !Number.isNaN(new Date(val).getTime());
  }
  return false;
}

/**
 * @entity activities
 */
export interface IActivity extends Entity {
  userId: number;
  customerId: number;
  invoiceId: number | null;
  status: string;
  paymentStatus: PaymentStatusCode;
  activityDate: Date;
  deliveryDate: Date | null;
  content: string | null;
}

/** Bổ sung thông tin thanh toán khi liệt kê hoạt động. */
export interface IActivityListItem extends IActivity {
  invoiceTotal: number;
  paidTotal: number;
  remaining: number;
  paymentStatusLabel: string;
}

export interface IActivityWrite {
  userId: number;
  customerId: number;
  content: string | null;
}

export interface IActivityUpdate extends IActivityWrite {
  id: number;
}

const GetDefaults = (): IActivity => ({
  id: 0,
  userId: 0,
  customerId: 0,
  invoiceId: null,
  status: 'draft',
  paymentStatus: PaymentStatuses.UNPAID,
  activityDate: new Date(),
  deliveryDate: null,
  content: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const isNullableString = makeNullable(isString);

const schema = {
  id: isUnsignedInteger,
  userId: isUnsignedInteger,
  customerId: isUnsignedInteger,
  invoiceId: isNullableInvoiceId,
  status: isString,
  paymentStatus: isPaymentStatusCode,
  activityDate: transformIsDate,
  deliveryDate: isNullableDeliveryDate,
  content: isNullableString,
  createdAt: transformIsDate,
  updatedAt: transformIsDate,
} satisfies Schema<IActivity>;

const writeSchema = {
  userId: isUnsignedInteger,
  customerId: isUnsignedInteger,
  content: isNullableString,
} satisfies Schema<IActivityWrite>;

const parseActivity = parseObject(schema);

const isCompleteActivityWrite = testObject<IActivityWrite>({
  ...writeSchema,
  userId: isUnsignedInteger,
  customerId: isUnsignedInteger,
  content: isNullableString,
});

const isCompleteActivityUpdate = testObject<IActivityUpdate>({
  id: isUnsignedInteger,
  userId: isUnsignedInteger,
  customerId: isUnsignedInteger,
  content: isNullableString,
});

function new_(activity?: Partial<IActivity>): IActivity {
  return parseActivity({ ...GetDefaults(), ...activity }, (errors) => {
    throw new Error(
      'Setup new activity failed ' + JSON.stringify(errors, null, 2),
    );
  });
}

export default {
  new: new_,
  isCompleteWrite: isCompleteActivityWrite,
  isCompleteUpdate: isCompleteActivityUpdate,
} as const;
