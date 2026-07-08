import { Prisma } from '@prisma/client';

import { IPayment } from '@src/models/Payment.model';

import { paymentToPrismaData, toPayment } from './common/mappers';
import prisma from './common/prisma';

type DbClient = typeof prisma | Prisma.TransactionClient;

async function getByActivity(activityId: number): Promise<IPayment[]> {
  const rows = await prisma.payment.findMany({
    where: { activity_id: activityId },
    orderBy: { payment_date: 'asc' },
  });
  return rows.map(toPayment);
}

async function sumByActivity(activityId: number): Promise<number> {
  const agg = await prisma.payment.aggregate({
    where: { activity_id: activityId },
    _sum: { paid_amount: true },
  });
  return Number(agg._sum.paid_amount ?? 0);
}

async function add(payment: IPayment): Promise<IPayment> {
  const row = await prisma.payment.create({
    data: paymentToPrismaData(payment),
  });
  return toPayment(row);
}

async function delete_(paymentId: number): Promise<void> {
  await prisma.payment.delete({ where: { payment_id: paymentId } });
}

async function setActivityPaymentStatus(
  activityId: number,
  paymentStatus: 'unpaid' | 'partial' | 'paid',
  client: DbClient = prisma,
): Promise<void> {
  await client.activity.update({
    where: { activity_id: activityId },
    data: { payment_status: paymentStatus },
  });
}

export default {
  getByActivity,
  sumByActivity,
  add,
  delete: delete_,
  setActivityPaymentStatus,
} as const;
