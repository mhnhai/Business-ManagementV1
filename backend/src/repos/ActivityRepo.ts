import { IActivity, IActivityListItem, IActivityWrite } from '@src/models/Activity.model';

import { OrderStatusCodes } from '@src/common/constants/order-status';
import {
  PaymentStatusLabels,
} from '@src/common/constants/payment-status';
import { activityWriteToPrismaData, toActivity } from './common/mappers';
import prisma from './common/prisma';
import {
  resolvePaymentStatus,
} from '@src/services/PaymentService';

/******************************************************************************
                                Functions
******************************************************************************/

async function getOne(id: number): Promise<IActivity | null> {
  const row = await prisma.activity.findUnique({
    where: { activity_id: id },
  });
  return row ? toActivity(row) : null;
}

async function persists(id: number): Promise<boolean> {
  const count = await prisma.activity.count({ where: { activity_id: id } });
  return count > 0;
}

async function getByInvoiceId(invoiceId: number): Promise<IActivity | null> {
  const row = await prisma.activity.findUnique({
    where: { invoice_id: invoiceId },
  });
  return row ? toActivity(row) : null;
}

async function getAll(userId?: number): Promise<IActivity[]> {
  const rows = await prisma.activity.findMany({
    where: userId !== undefined ? { user_id: userId } : {},
    orderBy: [{ created_at: 'desc' }, { activity_id: 'desc' }],
  });
  return rows.map(toActivity);
}

async function getAllWithPaymentInfo(
  userId?: number,
): Promise<IActivityListItem[]> {
  const rows = await prisma.activity.findMany({
    where: userId !== undefined ? { user_id: userId } : {},
    include: {
      invoice: { select: { total_amount: true } },
      payments: { select: { paid_amount: true } },
    },
    orderBy: [{ created_at: 'desc' }, { activity_id: 'desc' }],
  });

  return rows.map((row) => {
    const activity = toActivity(row);
    const invoiceTotal = row.invoice
      ? Number(row.invoice.total_amount)
      : 0;
    const paidTotal = row.payments.reduce(
      (sum, p) => sum + Number(p.paid_amount),
      0,
    );
    const remaining =
      row.invoice_id != null
        ? Math.max(0, invoiceTotal - paidTotal)
        : 0;
    const paymentStatus = resolvePaymentStatus(paidTotal, invoiceTotal);

    return {
      ...activity,
      invoiceTotal,
      paidTotal,
      remaining,
      paymentStatusLabel: PaymentStatusLabels[paymentStatus],
    };
  });
}

async function addDraft(input: IActivityWrite): Promise<IActivity> {
  const row = await prisma.activity.create({
    data: {
      ...activityWriteToPrismaData(input),
      activity_date: new Date(),
      status: OrderStatusCodes.DRAFT,
    },
  });
  return toActivity(row);
}

async function update(
  id: number,
  input: IActivityWrite,
  status?: string,
): Promise<IActivity> {
  const row = await prisma.activity.update({
    where: { activity_id: id },
    data: {
      ...activityWriteToPrismaData(input),
      ...(status ? { status } : {}),
    },
  });
  return toActivity(row);
}

async function linkInvoice(
  activityId: number,
  invoiceId: number,
  status: string,
  paymentStatus?: 'unpaid' | 'partial' | 'paid',
): Promise<IActivity> {
  const row = await prisma.activity.update({
    where: { activity_id: activityId },
    data: {
      invoice_id: invoiceId,
      status,
      ...(paymentStatus ? { payment_status: paymentStatus } : {}),
    },
  });
  return toActivity(row);
}

async function setStatus(
  activityId: number,
  status: string,
  options?: { deliveryDate?: Date },
): Promise<IActivity> {
  const row = await prisma.activity.update({
    where: { activity_id: activityId },
    data: {
      status,
      ...(options?.deliveryDate ? { delivery_date: options.deliveryDate } : {}),
    },
  });
  return toActivity(row);
}

async function delete_(id: number): Promise<void> {
  await prisma.activity.delete({ where: { activity_id: id } });
}

async function countByCustomer(customerId: number): Promise<number> {
  return prisma.activity.count({ where: { customer_id: customerId } });
}

async function countByUser(userId: number): Promise<number> {
  return prisma.activity.count({ where: { user_id: userId } });
}

async function getForExport(from: Date, toExclusive: Date, userId?: number) {
  return prisma.activity.findMany({
    where: {
      activity_date: { gte: from, lt: toExclusive },
      ...(userId !== undefined ? { user_id: userId } : {}),
    },
    include: {
      user: { select: { full_name: true, username: true } },
      customer: { select: { company_name: true } },
      invoice: { select: { total_amount: true } },
      details: {
        include: { product: { select: { product_name: true } } },
        orderBy: { product_id: 'asc' },
      },
    },
    orderBy: [{ activity_date: 'asc' }, { activity_id: 'asc' }],
  });
}

/******************************************************************************
                                Export default
******************************************************************************/

export default {
  getOne,
  persists,
  getByInvoiceId,
  getAll,
  getAllWithPaymentInfo,
  getForExport,
  addDraft,
  update,
  linkInvoice,
  setStatus,
  delete: delete_,
  countByCustomer,
  countByUser,
} as const;
