import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { ImportErrors as Errors } from '@src/common/constants/service-errors';
import { RouteError } from '@src/common/utils/route-errors';
import type { IImportWrite } from '@src/models/Import.model';
import ImportDetailRepo from '@src/repos/ImportDetailRepo';
import ImportRepo from '@src/repos/ImportRepo';
import SupplierRepo from '@src/repos/SupplierRepo';
import prisma from '@src/repos/common/prisma';

async function assertSupplierExists(supplierId: number) {
  if (!(await SupplierRepo.persists(supplierId))) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, Errors.SUPPLIER_NOT_FOUND);
  }
}

async function getAll() {
  return ImportRepo.getAll();
}

async function getOne(id: number) {
  const record = await ImportRepo.getOne(id);
  if (!record) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.IMPORT_NOT_FOUND);
  }
  return record;
}

async function addOne(input: IImportWrite) {
  await assertSupplierExists(input.supplierId);
  return ImportRepo.add(input);
}

async function updateOne(id: number, input: IImportWrite) {
  if (!(await ImportRepo.persists(id))) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.IMPORT_NOT_FOUND);
  }
  await assertSupplierExists(input.supplierId);
  return ImportRepo.update(id, input);
}

async function deleteOne(id: number): Promise<void> {
  if (!(await ImportRepo.persists(id))) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.IMPORT_NOT_FOUND);
  }

  const details = await ImportDetailRepo.getByImport(id);
  if (details.length > 0) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, Errors.HAS_DETAILS);
  }

  return ImportRepo.delete(id);
}

/** Xóa phiếu nhập kèm hoàn tồn kho (dùng khi cần force delete). */
async function deleteWithStockRollback(id: number): Promise<void> {
  if (!(await ImportRepo.persists(id))) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.IMPORT_NOT_FOUND);
  }

  await prisma.$transaction(async (tx) => {
    const lines = await tx.importDetail.findMany({ where: { import_id: id } });
    for (const line of lines) {
      await tx.product.update({
        where: { product_id: line.product_id },
        data: { stock_quantity: { decrement: line.quantity } },
      });
    }
    await tx.import.delete({ where: { import_id: id } });
  });
}

export default {
  Errors,
  getAll,
  getOne,
  addOne,
  updateOne,
  delete: deleteOne,
  deleteWithStockRollback,
} as const;
