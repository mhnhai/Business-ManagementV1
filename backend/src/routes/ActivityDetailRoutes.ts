import { isNumber } from 'jet-validators';
import { transform } from 'jet-validators/utils';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import ActivityDetail from '@src/models/ActivityDetail.model';
import ActivityDetailService from '@src/services/ActivityDetailService';
import { resolveEmployeeDataScope } from '@src/services/employee-scope';
import { ISessionUser } from '@src/models/common/types';

import { Req, Res } from './common/express-types';
import parseReq from './common/parseReq';

/******************************************************************************
                                Constants
******************************************************************************/

const reqValidators = {
  add: parseReq({ detail: ActivityDetail.isComplete }),
  update: parseReq({ detail: ActivityDetail.isComplete }),
  getByActivity: parseReq({ activityId: transform(Number, isNumber) }),
  delete: parseReq({
    activityId: transform(Number, isNumber),
    productId: transform(Number, isNumber),
  }),
} as const;

/******************************************************************************
                                Functions
******************************************************************************/

async function getByActivity(req: Req, res: Res) {
  const { activityId } = reqValidators.getByActivity(req.params);
  const sessionUser = res.locals.sessionUser as ISessionUser;
  const scope = await resolveEmployeeDataScope(sessionUser);
  const details = await ActivityDetailService.getByActivity(activityId, scope);
  res.status(HttpStatusCodes.OK).json({ details });
}

async function add(req: Req, res: Res) {
  const { detail } = reqValidators.add(req.body);
  const sessionUser = res.locals.sessionUser as ISessionUser;
  const scope = await resolveEmployeeDataScope(sessionUser);
  const created = await ActivityDetailService.addOne(detail, scope);
  res.status(HttpStatusCodes.CREATED).json({ detail: created });
}

async function update(req: Req, res: Res) {
  const { detail } = reqValidators.update(req.body);
  const sessionUser = res.locals.sessionUser as ISessionUser;
  const scope = await resolveEmployeeDataScope(sessionUser);
  const updated = await ActivityDetailService.updateOne(detail, scope);
  res.status(HttpStatusCodes.OK).json({ detail: updated });
}

async function delete_(req: Req, res: Res) {
  const { activityId, productId } = reqValidators.delete(req.params);
  const sessionUser = res.locals.sessionUser as ISessionUser;
  const scope = await resolveEmployeeDataScope(sessionUser);
  await ActivityDetailService.delete(activityId, productId, scope);
  res.status(HttpStatusCodes.OK).end();
}

/******************************************************************************
                                Export default
******************************************************************************/

export default {
  getByActivity,
  add,
  update,
  delete: delete_,
} as const;
