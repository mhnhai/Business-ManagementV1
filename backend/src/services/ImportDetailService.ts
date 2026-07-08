import { Prisma } from '@prisma/client';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { ImportDetailErrors as Errors } from '@src/common/constants/service-errors';
import { RouteError } from '@src/common/utils/route-errors';
import { IImportDetail } from '@src/models/ImportDetail.model';
import ImportDetailRepo from '@src/repos/ImportDetailRepo';
import ImportRepo from '@src/repos/ImportRepo';
import ProductRepo from '@src/repos/ProductRepo';
import { toImportDetailView } from '@src/repos/common/mappers';
import prisma from '@src/repos/common/prisma';

async function applyStockDelta(
  productId: number,
  delta: number,
  tx: Prisma.TransactionClient,
) {
  if (delta === 0) return;
  const product = await tx.product.findUnique({ where: { product_id: productId } });
  if (!product) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, Errors.PRODUCT_NOT_FOUND);
  }
  const next = product.stock_quantity + delta;
  if (next < 0) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, Errors.INSUFFICIENT_STOCK);
  }
  await tx.product.update({
    where: { product_id: productId },
    data: { stock_quantity: next },
  });
}

async function getByImport(importId: number) {
  if (!(await ImportRepo.persists(importId))) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.IMPORT_NOT_FOUND);
  }
  return ImportDetailRepo.getByImport(importId);
}

async function addOne(detail: IImportDetail) {
  if (!(await ImportRepo.persists(detail.importId))) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.IMPORT_NOT_FOUND);
  }
  if (!(await ProductRepo.persists(detail.productId))) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, Errors.PRODUCT_NOT_FOUND);
  }
  if (detail.quantity <= 0) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, Errors.INVALID_QUANTITY);
  }
  if (detail.importPrice <= 0) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, Errors.INVALID_PRICE);
  }
  if (await ImportDetailRepo.exists(detail.importId, detail.productId)) {
    throw new RouteError(
      HttpStatusCodes.BAD_REQUEST,
      Errors.DETAIL_ALREADY_EXISTS,
    );
  }

  return prisma.$transaction(async (tx) => {
    await tx.importDetail.create({
      data: {
        import_id: detail.importId,
        product_id: detail.productId,
        quantity: detail.quantity,
        import_price: detail.importPrice,
      },
    });
    await applyStockDelta(detail.productId, detail.quantity, tx);
    const row = await tx.importDetail.findUniqueOrThrow({
      where: {
        import_id_product_id: {
          import_id: detail.importId,
          product_id: detail.productId,
        },
      },
      include: { product: true },
    });
    return toImportDetailView(row);
  });
}

async function updateOne(detail: IImportDetail) {
  const existing = await ImportDetailRepo.getOne(detail.importId, detail.productId);
  if (!existing) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.DETAIL_NOT_FOUND);
  }
  if (detail.quantity <= 0) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, Errors.INVALID_QUANTITY);
  }
  if (detail.importPrice <= 0) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, Errors.INVALID_PRICE);
  }

  const qtyDelta = detail.quantity - existing.quantity;

  return prisma.$transaction(async (tx) => {
    if (qtyDelta !== 0) {
      await applyStockDelta(detail.productId, qtyDelta, tx);
    }
    const row = await tx.importDetail.update({
      where: {
        import_id_product_id: {
          import_id: detail.importId,
          product_id: detail.productId,
        },
      },
      data: {
        quantity: detail.quantity,
        import_price: detail.importPrice,
      },
      include: { product: true },
    });
    return toImportDetailView(row);
  });
}

async function deleteOne(importId: number, productId: number): Promise<void> {
  const existing = await ImportDetailRepo.getOne(importId, productId);
  if (!existing) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.DETAIL_NOT_FOUND);
  }

  await prisma.$transaction(async (tx) => {
    await applyStockDelta(productId, -existing.quantity, tx);
    await tx.importDetail.delete({
      where: {
        import_id_product_id: {
          import_id: importId,
          product_id: productId,
        },
      },
    });
  });
}

export default {
  Errors,
  getByImport,
  addOne,
  updateOne,
  delete: deleteOne,
} as const;
