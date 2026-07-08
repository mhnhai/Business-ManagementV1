import { isNumber } from 'jet-validators';
import { transform } from 'jet-validators/utils';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import Location from '@src/models/Location.model';
import LocationService from '@src/services/LocationService';

import { Req, Res } from './common/express-types';
import parseReq from './common/parseReq';

/******************************************************************************
                                Constants
******************************************************************************/

const reqValidators = {
  add: parseReq({ location: Location.isComplete }),
  update: parseReq({ location: Location.isComplete }),
  getOne: parseReq({ id: transform(Number, isNumber) }),
  delete: parseReq({ id: transform(Number, isNumber) }),
} as const;

/******************************************************************************
                                Functions
******************************************************************************/

async function getAll(_: Req, res: Res) {
  const locations = await LocationService.getAll();
  res.status(HttpStatusCodes.OK).json({ locations });
}

async function getOne(req: Req, res: Res) {
  const { id } = reqValidators.getOne(req.params);
  const location = await LocationService.getOne(id);
  res.status(HttpStatusCodes.OK).json({ location });
}

async function add(req: Req, res: Res) {
  const { location } = reqValidators.add(req.body);
  const created = await LocationService.addOne(location);
  res.status(HttpStatusCodes.CREATED).json({ location: created });
}

async function update(req: Req, res: Res) {
  const { location } = reqValidators.update(req.body);
  const updated = await LocationService.updateOne(location);
  res.status(HttpStatusCodes.OK).json({ location: updated });
}

async function delete_(req: Req, res: Res) {
  const { id } = reqValidators.delete(req.params);
  await LocationService.delete(id);
  res.status(HttpStatusCodes.OK).end();
}

/** Đồng bộ xã/phường Cần Thơ từ https://provinces.open-api.vn/api/v2 */
async function syncCanTho(_: Req, res: Res) {
  const result = await LocationService.syncCanThoFromApi();
  res.status(HttpStatusCodes.OK).json(result);
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
  syncCanTho,
} as const;
