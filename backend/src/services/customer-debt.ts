import { Prisma } from '@prisma/client';

import prisma from '@src/repos/common/prisma';
import { sumPayments } from '@src/services/PaymentService';

type DbClient = Prisma.TransactionClient | typeof prisma;

/** Tổng nợ trên các đơn đã có hóa đơn của khách hàng. */
export async function computeCustomerTotalDebt(
  customerId: number,
  db: DbClient = prisma,
): Promise<number> {
  const activities = await db.activity.findMany({
    where: {
      customer_id: customerId,
      invoice_id: { not: null },
    },
    include: { invoice: true },
  });

  let total = 0;
  for (const act of activities) {
    const invoiceTotal = Number(act.invoice?.total_amount ?? 0);
    const paidTotal = await sumPayments(act.activity_id, db);
    total += Math.max(0, invoiceTotal - paidTotal);
  }
  return total;
}
