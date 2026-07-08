import type { PaymentStatusCode } from '@src/common/constants/payment-status';
import type { ICustomer } from './Customer.model';

export interface ICustomerOrderRow {
  activityId: number;
  activityDate: Date;
  createdAt: Date;
  status: string;
  paymentStatus: PaymentStatusCode;
  paymentStatusLabel: string;
  invoiceTotal: number;
  paidTotal: number;
  remaining: number;
}

export interface ICustomerAccount {
  customer: ICustomer;
  currentBalance: number;
  totalDebt: number;
  orders: ICustomerOrderRow[];
}

export interface ICustomerPaymentAllocation {
  activityId: number;
  paidAmount: number;
}

export interface ICustomerReceivePaymentInput {
  amount: number;
  method: string;
}

export interface ICustomerReceivePaymentResult {
  allocations: ICustomerPaymentAllocation[];
  excessToBalance: number;
  account: ICustomerAccount;
}
