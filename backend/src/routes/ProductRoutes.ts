import { isNumber } from 'jet-validators';
import { transform } from 'jet-validators/utils';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import Product from '@src/models/Product.model';
import ProductService from '@src/services/ProductService';

import { Req, Res } from './common/express-types';
import parseReq from './common/parseReq';
import { parsePaginationQuery } from './common/pagination';

/******************************************************************************
                                Constants
******************************************************************************/

const reqValidators = {
  add: parseReq({ product: Product.isCompleteWrite }),
  update: parseReq({ product: Product.isCompleteUpdate }),
  getOne: parseReq({ id: transform(Number, isNumber) }),
  delete: parseReq({ id: transform(Number, isNumber) }),
} as const;

/******************************************************************************
                                Functions
******************************************************************************/

async function getAll(req: Req, res: Res) {
  const pagination = parsePaginationQuery(req.query, 10);
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  if (!pagination.enabled) {
    const products = await ProductService.getAll();
    res.status(HttpStatusCodes.OK).json({ products });
    return;
  }

  const result = await ProductService.getPage(pagination.page, pagination.pageSize, search);
  res.status(HttpStatusCodes.OK).json({
    products: result.items,
    total: result.total,
    page: pagination.page,
    pageSize: pagination.pageSize,
  });
}

async function getOne(req: Req, res: Res) {
  const { id } = reqValidators.getOne(req.params);
  const product = await ProductService.getOne(id);
  res.status(HttpStatusCodes.OK).json({ product });
}

async function add(req: Req, res: Res) {
  const { product } = reqValidators.add(req.body);
  const created = await ProductService.addOne(product);
  res.status(HttpStatusCodes.CREATED).json({ product: created });
}

async function update(req: Req, res: Res) {
  const { product } = reqValidators.update(req.body);
  const updated = await ProductService.updateOne(product);
  res.status(HttpStatusCodes.OK).json({ product: updated });
}

async function delete_(req: Req, res: Res) {
  const { id } = reqValidators.delete(req.params);
  await ProductService.delete(id);
  res.status(HttpStatusCodes.OK).end();
}

/******************************************************************************
                                Export default
******************************************************************************/

export default {
  getAll,
  getOne,
  add,
  update,
  delete: delete_,
} as const;
