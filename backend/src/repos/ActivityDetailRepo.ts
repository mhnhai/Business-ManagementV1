import { IActivityDetail } from '@src/models/ActivityDetail.model';

import {
  activityDetailToPrismaData,
  toActivityDetailView,
} from './common/mappers';
import prisma from './common/prisma';

/******************************************************************************
                                Functions
******************************************************************************/

async function getByActivity(activityId: number) {
  const rows = await prisma.activityDetail.findMany({
    where: { activity_id: activityId },
    include: { product: true },
    orderBy: { product_id: 'asc' },
  });
  return rows.map(toActivityDetailView);
}

async function exists(activityId: number, productId: number): Promise<boolean> {
  const row = await prisma.activityDetail.findUnique({
    where: {
      activity_id_product_id: {
        activity_id: activityId,
        product_id: productId,
      },
    },
  });
  return row !== null;
}

async function add(detail: IActivityDetail) {
  const row = await prisma.activityDetail.create({
    data: activityDetailToPrismaData(detail),
    include: { product: true },
  });
  return toActivityDetailView(row);
}

async function update(detail: IActivityDetail) {
  const row = await prisma.activityDetail.update({
    where: {
      activity_id_product_id: {
        activity_id: detail.activityId,
        product_id: detail.productId,
      },
    },
    data: {
      quantity: detail.quantity,
      sale_price: detail.salePrice,
    },
    include: { product: true },
  });
  return toActivityDetailView(row);
}

async function delete_(activityId: number, productId: number): Promise<void> {
  await prisma.activityDetail.delete({
    where: {
      activity_id_product_id: {
        activity_id: activityId,
        product_id: productId,
      },
    },
  });
}

async function sumLineTotals(activityId: number): Promise<number> {
  const rows = await prisma.activityDetail.findMany({
    where: { activity_id: activityId },
  });
  return rows.reduce(
    (sum, row) => sum + Number(row.sale_price) * row.quantity,
    0,
  );
}

async function getActivityInvoiceId(activityId: number): Promise<number | null> {
  const activity = await prisma.activity.findUnique({
    where: { activity_id: activityId },
    select: { invoice_id: true },
  });
  return activity?.invoice_id ?? null;
}

/******************************************************************************
                                Export default
******************************************************************************/

export default {
  getByActivity,
  exists,
  add,
  update,
  delete: delete_,
  sumLineTotals,
  getActivityInvoiceId,
} as const;
