import { isNumber } from 'jet-validators';
import { transform } from 'jet-validators/utils';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import Invoice from '@src/models/Invoice.model';
import InvoiceService from '@src/services/InvoiceService';

import { Req, Res } from './common/express-types';
import parseReq from './common/parseReq';

/******************************************************************************
                                Constants
******************************************************************************/

const reqValidators = {
  add: parseReq({ invoice: Invoice.isComplete }),
  update: parseReq({ invoice: Invoice.isComplete }),
  getOne: parseReq({ id: transform(Number, isNumber) }),
  delete: parseReq({ id: transform(Number, isNumber) }),
} as const;

/******************************************************************************
                                Functions
******************************************************************************/

async function getAll(_: Req, res: Res) {
  const invoices = await InvoiceService.getAll();
  res.status(HttpStatusCodes.OK).json({ invoices });
}

async function getOne(req: Req, res: Res) {
  const { id } = reqValidators.getOne(req.params);
  const invoice = await InvoiceService.getOne(id);
  res.status(HttpStatusCodes.OK).json({ invoice });
}

async function add(req: Req, res: Res) {
  const { invoice } = reqValidators.add(req.body);
  const created = await InvoiceService.addOne(invoice);
  res.status(HttpStatusCodes.CREATED).json({ invoice: created });
}

async function update(req: Req, res: Res) {
  const { invoice } = reqValidators.update(req.body);
  const updated = await InvoiceService.updateOne(invoice);
  res.status(HttpStatusCodes.OK).json({ invoice: updated });
}

async function delete_(req: Req, res: Res) {
  const { id } = reqValidators.delete(req.params);
  await InvoiceService.delete(id);
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
