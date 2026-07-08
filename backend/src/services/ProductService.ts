import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { ProductErrors as Errors } from '@src/common/constants/service-errors';
import { RouteError } from '@src/common/utils/route-errors';
import { IProductUpdate, IProductWrite } from '@src/models/Product.model';
import ProductRepo from '@src/repos/ProductRepo';

async function getAll() {
  return ProductRepo.getAll();
}

async function getOne(id: number) {
  const product = await ProductRepo.getOne(id);
  if (!product) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.PRODUCT_NOT_FOUND);
  }
  return product;
}

async function addOne(product: IProductWrite) {
  return ProductRepo.add(product);
}

async function updateOne(product: IProductUpdate) {
  const exists = await ProductRepo.persists(product.id);
  if (!exists) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.PRODUCT_NOT_FOUND);
  }
  return ProductRepo.update(product);
}

async function deleteOne(id: number): Promise<void> {
  const exists = await ProductRepo.persists(id);
  if (!exists) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.PRODUCT_NOT_FOUND);
  }
  return ProductRepo.delete(id);
}

/******************************************************************************
                                Export default
******************************************************************************/

export default {
  Errors,
  getAll,
  getOne,
  addOne,
  updateOne,
  delete: deleteOne,
} as const;
