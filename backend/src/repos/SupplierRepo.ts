import { ISupplier, ISupplierUpdate, ISupplierWrite } from '@src/models/Supplier.model';

import { supplierToPrismaData, toSupplier } from './common/mappers';
import prisma from './common/prisma';

async function getOne(id: number): Promise<ISupplier | null> {
  const row = await prisma.supplier.findUnique({ where: { supplier_id: id } });
  return row ? toSupplier(row) : null;
}

async function persists(id: number): Promise<boolean> {
  const count = await prisma.supplier.count({ where: { supplier_id: id } });
  return count > 0;
}

async function getAll(): Promise<ISupplier[]> {
  const rows = await prisma.supplier.findMany({ orderBy: { supplier_id: 'asc' } });
  return rows.map(toSupplier);
}

async function getPage(
  page: number,
  pageSize: number,
  search?: string,
): Promise<{ items: ISupplier[]; total: number }> {
  const skip = (page - 1) * pageSize;
  const keyword = search?.trim();
  const where = keyword
    ? {
        OR: [
          { supplier_name: { contains: keyword, mode: 'insensitive' as const } },
          { business_type: { contains: keyword, mode: 'insensitive' as const } },
          { address: { contains: keyword, mode: 'insensitive' as const } },
          { phone_number: { contains: keyword, mode: 'insensitive' as const } },
          { email: { contains: keyword, mode: 'insensitive' as const } },
          ...(Number.isFinite(Number(keyword))
            ? [{ supplier_id: Number(keyword) }]
            : []),
        ],
      }
    : undefined;
  const [rows, total] = await Promise.all([
    prisma.supplier.findMany({
      orderBy: { supplier_id: 'asc' },
      where,
      skip,
      take: pageSize,
    }),
    prisma.supplier.count({ where }),
  ]);
  return { items: rows.map(toSupplier), total };
}

async function add(supplier: ISupplierWrite): Promise<ISupplier> {
  const row = await prisma.supplier.create({
    data: supplierToPrismaData(supplier),
  });
  return toSupplier(row);
}

async function update(supplier: ISupplierUpdate): Promise<ISupplier> {
  const row = await prisma.supplier.update({
    where: { supplier_id: supplier.id },
    data: supplierToPrismaData(supplier),
  });
  return toSupplier(row);
}

async function delete_(id: number): Promise<void> {
  await prisma.supplier.delete({ where: { supplier_id: id } });
}

async function countImports(supplierId: number): Promise<number> {
  return prisma.import.count({ where: { supplier_id: supplierId } });
}

export default {
  getOne,
  persists,
  getAll,
  getPage,
  add,
  update,
  delete: delete_,
  countImports,
} as const;
