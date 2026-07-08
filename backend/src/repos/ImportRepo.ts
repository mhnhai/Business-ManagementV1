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
  add,
  update,
  delete: delete_,
  getForExport,
} as const;
