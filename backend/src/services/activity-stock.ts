import { Prisma } from '@prisma/client';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { ActivityStockErrors as Errors } from '@src/common/constants/service-errors';
import { RouteError } from '@src/common/utils/route-errors';
import prisma from '@src/repos/common/prisma';

type Tx = Prisma.TransactionClient;

async function loadOrderLines(activityId: number, tx: Tx) {
  return tx.activityDetail.findMany({
    where: { activity_id: activityId },
    include: { product: true },
    orderBy: { product_id: 'asc' },
  });
}

async function assertSufficientStock(
  activityId: number,
  tx: Tx,
  insufficientMessage: string,
): Promise<void> {
  const lines = await loadOrderLines(activityId, tx);

  if (lines.length === 0) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, Errors.NO_ORDER_LINES);
  }

  for (const line of lines) {
    if (!line.product) {
      throw new RouteError(HttpStatusCodes.BAD_REQUEST, Errors.PRODUCT_NOT_FOUND);
    }
    const available = line.product.stock_quantity;
    if (available < line.quantity) {
      throw new RouteError(
        HttpStatusCodes.BAD_REQUEST,
        `${insufficientMessage}: "${line.product.product_name}" (cần ${line.quantity}, còn ${available})`,
      );
    }
  }
}

/** Chỉ kiểm tra tồn kho khi xác nhận đơn (draft → confirmed). */
async function validateStockForConfirmedOrder(
  activityId: number,
  tx: Tx = prisma,
): Promise<void> {
  await assertSufficientStock(
    activityId,
    tx,
    Errors.INSUFFICIENT_STOCK_CONFIRM,
  );
}

/** Kiểm tra và trừ tồn kho khi hoàn thành đơn (processing → completed). */
async function deductStockForCompletedOrder(
  activityId: number,
  tx: Tx = prisma,
): Promise<void> {
  await assertSufficientStock(
    activityId,
    tx,
    Errors.INSUFFICIENT_STOCK_COMPLETE,
  );

  const lines = await loadOrderLines(activityId, tx);
  for (const line of lines) {
    await tx.product.update({
      where: { product_id: line.product_id },
      data: { stock_quantity: { decrement: line.quantity } },
    });
  }
}

export default {
  Errors,
  validateStockForConfirmedOrder,
  deductStockForCompletedOrder,
} as const;
