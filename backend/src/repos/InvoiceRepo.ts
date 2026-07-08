import { IInvoice } from '@src/models/Invoice.model';

import { invoiceToPrismaData, toInvoice } from './common/mappers';
import prisma from './common/prisma';

/******************************************************************************
                                Functions
******************************************************************************/

async function getOne(id: number): Promise<IInvoice | null> {
  const row = await prisma.invoice.findUnique({ where: { invoice_id: id } });
  return row ? toInvoice(row) : null;
}

async function persists(id: number): Promise<boolean> {
  const count = await prisma.invoice.count({ where: { invoice_id: id } });
  return count > 0;
}

async function getAll(): Promise<IInvoice[]> {
  const rows = await prisma.invoice.findMany({ orderBy: { invoice_id: 'asc' } });
  return rows.map(toInvoice);
}

async function add(invoice: IInvoice): Promise<IInvoice> {
  const row = await prisma.invoice.create({
    data: invoiceToPrismaData(invoice),
  });
  return toInvoice(row);
}

async function update(invoice: IInvoice): Promise<IInvoice> {
  const row = await prisma.invoice.update({
    where: { invoice_id: invoice.id },
    data: invoiceToPrismaData(invoice),
  });
  return toInvoice(row);
}

async function delete_(id: number): Promise<void> {
  await prisma.invoice.delete({ where: { invoice_id: id } });
}

async function isLinkedToActivity(invoiceId: number): Promise<boolean> {
  const count = await prisma.activity.count({
    where: { invoice_id: invoiceId },
  });
  return count > 0;
}

/******************************************************************************
                                Export default
******************************************************************************/

export default {
  getOne,
  persists,
  getAll,
  add,
  update,
  delete: delete_,
  isLinkedToActivity,
} as const;
