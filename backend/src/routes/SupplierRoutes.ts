import { isNumber } from 'jet-validators';
import { transform } from 'jet-validators/utils';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import Supplier from '@src/models/Supplier.model';
import SupplierService from '@src/services/SupplierService';

import { Req, Res } from './common/express-types';
import parseReq from './common/parseReq';

const reqValidators = {
  add: parseReq({ supplier: Supplier.isCompleteWrite }),
  update: parseReq({ supplier: Supplier.isCompleteUpdate }),
  getOne: parseReq({ id: transform(Number, isNumber) }),
  delete: parseReq({ id: transform(Number, isNumber) }),
} as const;

async function getAll(_: Req, res: Res) {
  const suppliers = await SupplierService.getAll();
  res.status(HttpStatusCodes.OK).json({ suppliers });
}

async function getOne(req: Req, res: Res) {
  const { id } = reqValidators.getOne(req.params);
  const supplier = await SupplierService.getOne(id);
  res.status(HttpStatusCodes.OK).json({ supplier });
}

async function add(req: Req, res: Res) {
  const { supplier } = reqValidators.add(req.body);
  const created = await SupplierService.addOne(supplier);
  res.status(HttpStatusCodes.CREATED).json({ supplier: created });
}

async function update(req: Req, res: Res) {
  const { supplier } = reqValidators.update(req.body);
  const updated = await SupplierService.updateOne(supplier);
  res.status(HttpStatusCodes.OK).json({ supplier: updated });
}

async function delete_(req: Req, res: Res) {
  const { id } = reqValidators.delete(req.params);
  await SupplierService.delete(id);
  res.status(HttpStatusCodes.OK).end();
}

export default {
  getAll,
  getOne,
  add,
  update,
  delete: delete_,
} as const;
