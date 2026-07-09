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

async function getPage(
  page: number,
  pageSize: number,
  search?: string,
): Promise<{ items: IProduct[]; total: number }> {
  const skip = (page - 1) * pageSize;
  const keyword = search?.trim();
  const where = keyword
    ? {
        OR: [
          { product_name: { contains: keyword, mode: 'insensitive' as const } },
          ...(Number.isFinite(Number(keyword))
            ? [{ product_id: Number(keyword) }]
            : []),
        ],
      }
    : undefined;
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      orderBy: { product_id: 'asc' },
      where,
      skip,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);
  return { items: rows.map(toProduct), total };
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
  getPage,
  add,
  update,
  delete: delete_,
} as const;
