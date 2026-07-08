import { IProduct, IProductUpdate, IProductWrite } from '@src/models/Product.model';

import { productToPrismaData, toProduct } from './common/mappers';
import prisma from './common/prisma';

/******************************************************************************
                                Functions
******************************************************************************/

async function getOne(id: number): Promise<IProduct | null> {
  const row = await prisma.product.findUnique({ where: { product_id: id } });
  return row ? toProduct(row) : null;
}

async function persists(id: number): Promise<boolean> {
  const count = await prisma.product.count({ where: { product_id: id } });
  return count > 0;
}

async function getAll(): Promise<IProduct[]> {
  const rows = await prisma.product.findMany({ orderBy: { product_id: 'asc' } });
  return rows.map(toProduct);
}

async function add(product: IProductWrite): Promise<IProduct> {
  const row = await prisma.product.create({
    data: productToPrismaData(product),
  });
  return toProduct(row);
}

async function update(product: IProductUpdate): Promise<IProduct> {
  const row = await prisma.product.update({
    where: { product_id: product.id },
    data: productToPrismaData(product),
  });
  return toProduct(row);
}

async function delete_(id: number): Promise<void> {
  await prisma.product.delete({ where: { product_id: id } });
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
} as const;
