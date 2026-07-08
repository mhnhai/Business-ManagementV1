import { Prisma } from '@prisma/client';

import { OrderStatusCodes } from '@src/common/constants/order-status';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import {
  PAYMENT_METHOD_CUSTOMER_BALANCE,
  PaymentStatusLabels,
  PaymentStatuses,
  type PaymentStatusCode,
} from '@src/common/constants/payment-status';
import { PaymentErrors as Errors } from '@src/common/constants/service-errors';
import { RouteError } from '@src/common/utils/route-errors';
import type { IPaymentRecordInput, IPaymentSummary } from '@src/models/Payment.model';
import ActivityRepo from '@src/repos/ActivityRepo';
import PaymentRepo from '@src/repos/PaymentRepo';
import { toPayment } from '@src/repos/common/mappers';
import prisma from '@src/repos/common/prisma';
import { computeCustomerTotalDebt } from '@src/services/customer-debt';

type Tx = Prisma.TransactionClient;

export interface ISettlePaymentsOptions {
  pendingPayments: IPaymentRecordInput[];
  applyCustomerBalance?: boolean;
}

export interface IAllocatePaymentResult {
  allocations: { activityId: number; paidAmount: number }[];
  excessToBalance: number;
}

export interface IAllocatePaymentOptions {
  /** Ưu tiên trừ nợ đơn này trước, sau đó các đơn còn lại theo thứ tự cũ → mới. */
  priorityActivityId?: number;
  paymentDate?: Date;
}

async function getInvoiceTotal(
  activityId: number,
  tx: Tx | typeof prisma = prisma,
): Promise<number> {
  const activity = await tx.activity.findUnique({
    where: { activity_id: activityId },
    include: { invoice: true },
  });
  if (!activity?.invoice) return 0;
  return Number(activity.invoice.total_amount);
}

export async function sumPayments(activityId: number, tx: Tx | typeof prisma = prisma) {
  const agg = await tx.payment.aggregate({
    where: { activity_id: activityId },
    _sum: { paid_amount: true },
  });
  return Number(agg._sum.paid_amount ?? 0);
}

export function resolvePaymentStatus(
  paidTotal: number,
  invoiceTotal: number,
): PaymentStatusCode {
  if (paidTotal <= 0) return PaymentStatuses.UNPAID;
  if (paidTotal >= invoiceTotal) return PaymentStatuses.PAID;
  return PaymentStatuses.PARTIAL;
}

export async function syncActivityPaymentStatus(
  activityId: number,
  tx: Tx | typeof prisma = prisma,
): Promise<PaymentStatusCode> {
  const invoiceTotal = await getInvoiceTotal(activityId, tx);
  if (invoiceTotal <= 0) {
    await PaymentRepo.setActivityPaymentStatus(activityId, PaymentStatuses.UNPAID, tx);
    return PaymentStatuses.UNPAID;
  }

  const paidTotal = await sumPayments(activityId, tx);
  const paymentStatus = resolvePaymentStatus(paidTotal, invoiceTotal);
  await PaymentRepo.setActivityPaymentStatus(activityId, paymentStatus, tx);
  return paymentStatus;
}

async function assertActivityProcessing(activityId: number) {
  const activity = await ActivityRepo.getOne(activityId);
  if (!activity) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.ACTIVITY_NOT_FOUND);
  }
  if (!activity.invoiceId) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, Errors.NO_INVOICE);
  }
  if (activity.status !== OrderStatusCodes.PROCESSING) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, Errors.NOT_PROCESSING);
  }
  return activity;
}

function rejectIfProcessingDeferred(activityId: number) {
  return ActivityRepo.getOne(activityId).then((activity) => {
    if (activity?.status === OrderStatusCodes.PROCESSING) {
      throw new RouteError(HttpStatusCodes.BAD_REQUEST, Errors.PAYMENTS_DEFERRED);
    }
  });
}

async function getInvoicedActivitiesForCustomer(customerId: number, tx: Tx) {
  return tx.activity.findMany({
    where: {
      customer_id: customerId,
      invoice_id: { not: null },
    },
    include: { invoice: true },
    orderBy: [{ created_at: 'asc' }, { activity_id: 'asc' }],
  });
}

async function getOrderRemaining(activityId: number, tx: Tx): Promise<number> {
  const invoiceTotal = await getInvoiceTotal(activityId, tx);
  const paidTotal = await sumPayments(activityId, tx);
  return Math.max(0, invoiceTotal - paidTotal);
}

function orderActivitiesWithPriority<T extends { activity_id: number }>(
  activities: T[],
  priorityActivityId?: number,
): T[] {
  if (!priorityActivityId) return activities;
  const priority = activities.find((a) => a.activity_id === priorityActivityId);
  const rest = activities.filter((a) => a.activity_id !== priorityActivityId);
  return priority ? [priority, ...rest] : activities;
}

async function recordPaymentToOrder(
  activityId: number,
  paidAmount: number,
  method: string,
  paymentDate: Date,
  tx: Tx,
): Promise<void> {
  if (paidAmount <= 0) return;
  const remaining = await getOrderRemaining(activityId, tx);
  const toOrder = Math.min(paidAmount, remaining);
  if (toOrder <= 0) return;

  await tx.payment.create({
    data: {
      activity_id: activityId,
      paid_amount: toOrder,
      payment_date: paymentDate,
      method,
    },
  });
}

/**
 * Phân bổ tiền vào các đơn còn nợ (giống module khách hàng).
 * Tiền thừa sau khi trừ hết nợ mới cộng vào số dư.
 */
export async function allocateCustomerPayment(
  customerId: number,
  amount: number,
  method: string,
  tx: Tx,
  options?: IAllocatePaymentOptions,
): Promise<IAllocatePaymentResult> {
  if (amount <= 0) {
    return { allocations: [], excessToBalance: 0 };
  }

  const paymentDate = options?.paymentDate ?? new Date();
  let left = amount;
  const allocations: IAllocatePaymentResult['allocations'] = [];

  const activities = await getInvoicedActivitiesForCustomer(customerId, tx);
  const ordered = orderActivitiesWithPriority(
    activities,
    options?.priorityActivityId,
  );

  for (const act of ordered) {
    if (left <= 0) break;

    const remaining = await getOrderRemaining(act.activity_id, tx);
    if (remaining <= 0) continue;

    const pay = Math.min(left, remaining);
    await recordPaymentToOrder(act.activity_id, pay, method, paymentDate, tx);
    await syncActivityPaymentStatus(act.activity_id, tx);
    left -= pay;
    allocations.push({ activityId: act.activity_id, paidAmount: pay });
  }

  if (left > 0) {
    await tx.customer.update({
      where: { customer_id: customerId },
      data: { current_balance: { increment: left } },
    });
  }

  return { allocations, excessToBalance: left > 0 ? left : 0 };
}

/** Trừ số dư khách vào các đơn còn nợ (đơn cũ trước). */
export async function applyCustomerBalanceAcrossOrders(
  customerId: number,
  tx: Tx,
): Promise<number> {
  const customer = await tx.customer.findUnique({
    where: { customer_id: customerId },
  });
  if (!customer) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, Errors.CUSTOMER_NOT_FOUND);
  }

  let balance = Number(customer.current_balance);
  if (balance <= 0) return 0;

  const activities = await getInvoicedActivitiesForCustomer(customerId, tx);
  let totalApplied = 0;

  for (const act of activities) {
    if (balance <= 0) break;

    const remaining = await getOrderRemaining(act.activity_id, tx);
    if (remaining <= 0) continue;

    const apply = Math.min(balance, remaining);
    await tx.customer.update({
      where: { customer_id: customerId },
      data: { current_balance: { decrement: apply } },
    });
    await tx.payment.create({
      data: {
        activity_id: act.activity_id,
        paid_amount: apply,
        payment_date: new Date(),
        method: PAYMENT_METHOD_CUSTOMER_BALANCE,
      },
    });
    await syncActivityPaymentStatus(act.activity_id, tx);
    balance -= apply;
    totalApplied += apply;
  }

  return totalApplied;
}

async function buildSummaryInTx(activityId: number, tx: Tx): Promise<IPaymentSummary> {
  const activity = await tx.activity.findUnique({ where: { activity_id: activityId } });
  if (!activity) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.ACTIVITY_NOT_FOUND);
  }

  const invoiceTotal = await getInvoiceTotal(activityId, tx);
  const paidTotal = await sumPayments(activityId, tx);
  const remaining = Math.max(0, invoiceTotal - paidTotal);
  const customer = await tx.customer.findUnique({
    where: { customer_id: activity.customer_id },
  });
  const paymentStatus = resolvePaymentStatus(paidTotal, invoiceTotal);
  const rows = await tx.payment.findMany({
    where: { activity_id: activityId },
    orderBy: { payment_date: 'asc' },
  });

  const isProcessing = activity.status === OrderStatusCodes.PROCESSING;

  const customerTotalDebt = await computeCustomerTotalDebt(
    activity.customer_id,
    tx,
  );
  const customerDebtOtherOrders = Math.max(0, customerTotalDebt - remaining);

  return {
    activityId,
    invoiceTotal,
    paidTotal,
    remaining,
    customerBalance: Number(customer?.current_balance ?? 0),
    customerTotalDebt,
    customerDebtOtherOrders,
    paymentStatus,
    paymentStatusLabel: PaymentStatusLabels[paymentStatus],
    canRecordPayment:
      isProcessing && invoiceTotal > 0,
    paymentsDeferred: isProcessing,
    payments: rows.map(toPayment),
  };
}

/** Ghi toàn bộ thanh toán tạm khi hoàn thành đơn (chỉ gọi từ advance → completed). */
export async function settlePendingPaymentsInTx(
  activityId: number,
  customerId: number,
  options: ISettlePaymentsOptions,
  tx: Tx,
): Promise<void> {
  if (options.applyCustomerBalance !== false) {
    await applyCustomerBalanceAcrossOrders(customerId, tx);
  }

  for (const entry of options.pendingPayments) {
    await allocateCustomerPayment(
      customerId,
      entry.paidAmount,
      entry.method,
      tx,
      {
        priorityActivityId: activityId,
        paymentDate: entry.paymentDate
          ? new Date(entry.paymentDate)
          : new Date(),
      },
    );
  }

  await syncActivityPaymentStatus(activityId, tx);
}

/** Ghi toàn bộ thanh toán tạm khi hoàn thành đơn (chỉ gọi từ advance → completed). */
async function settlePendingPayments(
  activityId: number,
  options: ISettlePaymentsOptions,
): Promise<IPaymentSummary> {
  const activity = await assertActivityProcessing(activityId);

  return prisma.$transaction(async (tx) => {
    await settlePendingPaymentsInTx(
      activityId,
      activity.customerId,
      options,
      tx,
    );
    return buildSummaryInTx(activityId, tx);
  });
}

async function getSummary(activityId: number): Promise<IPaymentSummary> {
  const activity = await ActivityRepo.getOne(activityId);
  if (!activity) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.ACTIVITY_NOT_FOUND);
  }

  const invoiceTotal = activity.invoiceId
    ? await getInvoiceTotal(activityId)
    : 0;
  const paidTotal = await sumPayments(activityId);
  const remaining = Math.max(0, invoiceTotal - paidTotal);

  const customer = await prisma.customer.findUnique({
    where: { customer_id: activity.customerId },
  });
  const customerBalance = Number(customer?.current_balance ?? 0);

  const paymentStatus = resolvePaymentStatus(paidTotal, invoiceTotal);
  const payments = await PaymentRepo.getByActivity(activityId);
  const isProcessing = activity.status === OrderStatusCodes.PROCESSING;

  const customerTotalDebt = await computeCustomerTotalDebt(activity.customerId);
  const customerDebtOtherOrders = Math.max(0, customerTotalDebt - remaining);

  return {
    activityId,
    invoiceTotal,
    paidTotal: isProcessing ? 0 : paidTotal,
    remaining: isProcessing ? invoiceTotal : remaining,
    customerBalance,
    customerTotalDebt,
    customerDebtOtherOrders,
    paymentStatus: isProcessing ? PaymentStatuses.UNPAID : paymentStatus,
    paymentStatusLabel: isProcessing
      ? PaymentStatusLabels[PaymentStatuses.UNPAID]
      : PaymentStatusLabels[paymentStatus],
    canRecordPayment: isProcessing && invoiceTotal > 0,
    paymentsDeferred: isProcessing,
    payments: isProcessing ? [] : payments,
  };
}

async function getByActivity(activityId: number) {
  if (!(await ActivityRepo.persists(activityId))) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.ACTIVITY_NOT_FOUND);
  }
  return PaymentRepo.getByActivity(activityId);
}

async function applyCustomerBalance(activityId: number) {
  await rejectIfProcessingDeferred(activityId);
  const activity = await ActivityRepo.getOne(activityId);
  if (!activity) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.ACTIVITY_NOT_FOUND);
  }

  return prisma.$transaction(async (tx) => {
    const applied = await applyCustomerBalanceAcrossOrders(
      activity.customerId,
      tx,
    );
    const paymentStatus = await syncActivityPaymentStatus(activityId, tx);
    return { applied, paymentStatus, summary: await buildSummaryInTx(activityId, tx) };
  });
}

async function recordPayment(activityId: number, input: IPaymentRecordInput) {
  await rejectIfProcessingDeferred(activityId);
  const activity = await ActivityRepo.getOne(activityId);
  if (!activity) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.ACTIVITY_NOT_FOUND);
  }

  return prisma.$transaction(async (tx) => {
    if (input.applyCustomerBalance !== false) {
      await applyCustomerBalanceAcrossOrders(activity.customerId, tx);
    }

    const { excessToBalance } = await allocateCustomerPayment(
      activity.customerId,
      input.paidAmount,
      input.method,
      tx,
      {
        priorityActivityId: activityId,
        paymentDate: input.paymentDate
          ? new Date(input.paymentDate)
          : new Date(),
      },
    );

    await syncActivityPaymentStatus(activityId, tx);
    const summary = await buildSummaryInTx(activityId, tx);
    const payments = await tx.payment.findMany({
      where: { activity_id: activityId },
      orderBy: { payment_id: 'desc' },
      take: 1,
    });
    const latestPayment = payments[0] ? toPayment(payments[0]) : null;

    return { payment: latestPayment, excessToBalance, summary };
  });
}

async function deleteOne(paymentId: number): Promise<void> {
  const row = await prisma.payment.findUnique({
    where: { payment_id: paymentId },
  });
  if (!row) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.PAYMENT_NOT_FOUND);
  }

  const activityId = row.activity_id;
  await rejectIfProcessingDeferred(activityId);

  await prisma.$transaction(async (tx) => {
    const activity = await tx.activity.findUnique({
      where: { activity_id: activityId },
    });
    if (!activity) return;

    if (row.method === PAYMENT_METHOD_CUSTOMER_BALANCE) {
      await tx.customer.update({
        where: { customer_id: activity.customer_id },
        data: { current_balance: { increment: Number(row.paid_amount) } },
      });
    }

    await tx.payment.delete({ where: { payment_id: paymentId } });
    await syncActivityPaymentStatus(activityId, tx);
  });
}

export default {
  Errors,
  getSummary,
  getByActivity,
  applyCustomerBalance,
  recordPayment,
  settlePendingPayments,
  delete: deleteOne,
  syncActivityPaymentStatus,
} as const;
