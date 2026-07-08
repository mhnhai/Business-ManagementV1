import { isNumber } from 'jet-validators';
import { transform } from 'jet-validators/utils';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import ImportDetail from '@src/models/ImportDetail.model';
import ImportDetailService from '@src/services/ImportDetailService';

import { Req, Res } from './common/express-types';
import parseReq from './common/parseReq';

const reqValidators = {
  add: parseReq({ detail: ImportDetail.isComplete }),
  update: parseReq({ detail: ImportDetail.isComplete }),
  getByImport: parseReq({ importId: transform(Number, isNumber) }),
  delete: parseReq({
    importId: transform(Number, isNumber),
    productId: transform(Number, isNumber),
  }),
} as const;

async function getByImport(req: Req, res: Res) {
  const { importId } = reqValidators.getByImport(req.params);
  const details = await ImportDetailService.getByImport(importId);
  res.status(HttpStatusCodes.OK).json({ details });
}

async function add(req: Req, res: Res) {
  const { detail } = reqValidators.add(req.body);
  const created = await ImportDetailService.addOne(detail);
  res.status(HttpStatusCodes.CREATED).json({ detail: created });
}

async function update(req: Req, res: Res) {
  const { detail } = reqValidators.update(req.body);
  const updated = await ImportDetailService.updateOne(detail);
  res.status(HttpStatusCodes.OK).json({ detail: updated });
}

async function delete_(req: Req, res: Res) {
  const { importId, productId } = reqValidators.delete(req.params);
  await ImportDetailService.delete(importId, productId);
  res.status(HttpStatusCodes.OK).end();
}

export default {
  getByImport,
  add,
  update,
  delete: delete_,
} as const;
