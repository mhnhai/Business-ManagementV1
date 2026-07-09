import type { IImport, IImportWrite } from '@src/models/Import.model';

import { importWriteToPrismaData, toImport } from './common/mappers';
import prisma from './common/prisma';

async function getOne(id: number): Promise<IImport | null> {
  const row = await prisma.import.findUnique({ where: { import_id: id } });
  return row ? toImport(row) : null;
}

async function persists(id: number): Promise<boolean> {
  const count = await prisma.import.count({ where: { import_id: id } });
  return count > 0;
}

async function getAll() {
  const rows = await prisma.import.findMany({
    include: {
      supplier: { select: { supplier_name: true } },
      details: { select: { quantity: true, import_price: true } },
    },
    orderBy: { import_id: 'desc' },
  });

  return rows.map((row) => {
    const base = toImport(row);
    const totalAmount = row.details.reduce(
      (sum, d) => sum + Number(d.import_price) * d.quantity,
      0,
    );
    return {
      ...base,
      supplierName: row.supplier.supplier_name,
      totalAmount,
      lineCount: row.details.length,
    };
  });
}

async function getPage(
  page: number,
  pageSize: number,
  filters?: { search?: string; fromDate?: string; toDate?: string },
) {
  const skip = (page - 1) * pageSize;
  const keyword = filters?.search?.trim();
  const from = filters?.fromDate ? new Date(`${filters.fromDate}T00:00:00`) : undefined;
  const to = filters?.toDate ? new Date(`${filters.toDate}T23:59:59.999`) : undefined;
  const where = {
    ...(keyword
      ? {
          OR: [
            { content: { contains: keyword, mode: 'insensitive' as const } },
            { supplier: { supplier_name: { contains: keyword, mode: 'insensitive' as const } } },
            ...(Number.isFinite(Number(keyword))
              ? [{ import_id: Number(keyword) }]
              : []),
          ],
        }
      : {}),
    ...(from || to
      ? {
          import_date: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.import.findMany({
      include: {
        supplier: { select: { supplier_name: true } },
        details: { select: { quantity: true, import_price: true } },
      },
      orderBy: { import_id: 'desc' },
      where,
      skip,
      take: pageSize,
    }),
    prisma.import.count({ where }),
  ]);

  const items = rows.map((row) => {
    const base = toImport(row);
    const totalAmount = row.details.reduce(
      (sum, d) => sum + Number(d.import_price) * d.quantity,
      0,
    );
    return {
      ...base,
      supplierName: row.supplier.supplier_name,
      totalAmount,
      lineCount: row.details.length,
    };
  });

  return { items, total };
}

async function add(input: IImportWrite): Promise<IImport> {
  const row = await prisma.import.create({
    data: {
      ...importWriteToPrismaData(input),
      import_date: new Date(),
    },
  });
  return toImport(row);
}

async function update(id: number, input: IImportWrite): Promise<IImport> {
  const row = await prisma.import.update({
    where: { import_id: id },
    data: importWriteToPrismaData(input),
  });
  return toImport(row);
}

async function delete_(id: number): Promise<void> {
  await prisma.import.delete({ where: { import_id: id } });
}

async function getForExport(from: Date, toExclusive: Date) {
  return prisma.import.findMany({
    where: {
      import_date: { gte: from, lt: toExclusive },
    },
    include: {
      supplier: { select: { supplier_name: true } },
      details: {
        include: {
          product: { select: { product_name: true, unit_price: true } },
        },
        orderBy: { product_id: 'asc' },
      },
    },
    orderBy: [{ import_date: 'asc' }, { import_id: 'asc' }],
  });
}

export default {
  getOne,
  persists,
  getAll,
  getPage,
  add,
  update,
  delete: delete_,
  getForExport,
} as const;
