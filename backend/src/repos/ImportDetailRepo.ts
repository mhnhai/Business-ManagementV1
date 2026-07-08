import { IImportDetail } from '@src/models/ImportDetail.model';

import {
  importDetailToPrismaData,
  toImportDetailView,
} from './common/mappers';
import prisma from './common/prisma';

async function getByImport(importId: number) {
  const rows = await prisma.importDetail.findMany({
    where: { import_id: importId },
    include: { product: true },
    orderBy: { product_id: 'asc' },
  });
  return rows.map(toImportDetailView);
}

async function exists(importId: number, productId: number): Promise<boolean> {
  const row = await prisma.importDetail.findUnique({
    where: {
      import_id_product_id: {
        import_id: importId,
        product_id: productId,
      },
    },
  });
  return row !== null;
}

async function getOne(importId: number, productId: number) {
  const row = await prisma.importDetail.findUnique({
    where: {
      import_id_product_id: {
        import_id: importId,
        product_id: productId,
      },
    },
  });
  return row;
}

async function add(detail: IImportDetail) {
  const row = await prisma.importDetail.create({
    data: importDetailToPrismaData(detail),
    include: { product: true },
  });
  return toImportDetailView(row);
}

async function update(detail: IImportDetail) {
  const row = await prisma.importDetail.update({
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
}

async function delete_(importId: number, productId: number): Promise<void> {
  await prisma.importDetail.delete({
    where: {
      import_id_product_id: {
        import_id: importId,
        product_id: productId,
      },
    },
  });
}

async function sumLineTotals(importId: number): Promise<number> {
  const rows = await prisma.importDetail.findMany({
    where: { import_id: importId },
  });
  return rows.reduce(
    (sum, row) => sum + Number(row.import_price) * row.quantity,
    0,
  );
}

export default {
  getByImport,
  exists,
  getOne,
  add,
  update,
  delete: delete_,
  sumLineTotals,
} as const;
