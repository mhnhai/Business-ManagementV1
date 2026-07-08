import { isNumber } from 'jet-validators';
import { transform } from 'jet-validators/utils';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { Roles } from '@src/common/constants/roles';
import { RouteError } from '@src/common/utils/route-errors';
import Activity from '@src/models/Activity.model';
import type { IActivityWrite } from '@src/models/Activity.model';
import { ISessionUser } from '@src/models/common/types';
import ActivityExportService from '@src/services/activity-export';
import ActivityService from '@src/services/ActivityService';
import { resolveEmployeeDataScope } from '@src/services/employee-scope';

import { Req, Res } from './common/express-types';
import parseReq from './common/parseReq';

function activityWriteForSession(
  sessionUser: ISessionUser,
  activity: IActivityWrite,
): IActivityWrite {
  if (sessionUser.role === Roles.ADMIN) {
    return activity;
  }
  return { ...activity, userId: sessionUser.userId };
}

/******************************************************************************
                                Constants
******************************************************************************/

const reqValidators = {
  add: parseReq({ activity: Activity.isCompleteWrite }),
  update: parseReq({ activity: Activity.isCompleteUpdate }),
  getOne: parseReq({ id: transform(Number, isNumber) }),
  delete: parseReq({ id: transform(Number, isNumber) }),
  confirm: parseReq({ id: transform(Number, isNumber) }),
  advance: parseReq({ id: transform(Number, isNumber) }),
} as const;

/******************************************************************************
                                Functions
******************************************************************************/

async function getAll(_: Req, res: Res) {
  const sessionUser = res.locals.sessionUser as ISessionUser;
  const scope = await resolveEmployeeDataScope(sessionUser);
  const activities = await ActivityService.getAll(scope);
  res.status(HttpStatusCodes.OK).json({ activities });
}

function queryString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return '';
}

async function exportExcel(req: Req, res: Res) {
  const fromDate = queryString(req.query.fromDate);
  const toDate = queryString(req.query.toDate);
  if (!fromDate || !toDate) {
    throw new RouteError(
      HttpStatusCodes.BAD_REQUEST,
      'Thiếu fromDate hoặc toDate (YYYY-MM-DD)',
    );
  }

  const sessionUser = res.locals.sessionUser as ISessionUser;
  const userId =
    sessionUser.role === Roles.ADMIN ? undefined : sessionUser.userId;

  const buffer = await ActivityExportService.buildExcel(
    fromDate,
    toDate,
    userId,
  );

  const filename = `hoat-dong_${fromDate}_${toDate}.xlsx`;
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"`,
  );
  res.status(HttpStatusCodes.OK).send(buffer);
}

async function getOne(req: Req, res: Res) {
  const { id } = reqValidators.getOne(req.params);
  const sessionUser = res.locals.sessionUser as ISessionUser;
  const scope = await resolveEmployeeDataScope(sessionUser);
  const activity = await ActivityService.getOne(id, scope);
  res.status(HttpStatusCodes.OK).json({ activity });
}

async function add(req: Req, res: Res) {
  const { activity } = reqValidators.add(req.body);
  const sessionUser = res.locals.sessionUser as ISessionUser;
  const scope = await resolveEmployeeDataScope(sessionUser);
  const created = await ActivityService.addOne(
    activityWriteForSession(sessionUser, activity),
    scope,
  );
  res.status(HttpStatusCodes.CREATED).json({ activity: created });
}

async function update(req: Req, res: Res) {
  const { activity } = reqValidators.update(req.body);
  const sessionUser = res.locals.sessionUser as ISessionUser;
  const scope = await resolveEmployeeDataScope(sessionUser);
  const updated = await ActivityService.updateOne(
    activity.id,
    activityWriteForSession(sessionUser, {
      userId: activity.userId,
      customerId: activity.customerId,
      content: activity.content,
    }),
    scope,
  );
  res.status(HttpStatusCodes.OK).json({ activity: updated });
}

async function confirm(req: Req, res: Res) {
  const { id } = reqValidators.confirm(req.params);
  const sessionUser = res.locals.sessionUser as ISessionUser;
  const scope = await resolveEmployeeDataScope(sessionUser);
  const result = await ActivityService.confirmOrder(id, scope);
  res.status(HttpStatusCodes.OK).json(result);
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

async function advanceStatus(req: Req, res: Res) {
  const { id } = reqValidators.advance(req.params);
  const sessionUser = res.locals.sessionUser as ISessionUser;
  const scope = await resolveEmployeeDataScope(sessionUser);
  const body = req.body ?? {};
  const pendingPayments = Array.isArray(body.pendingPayments)
    ? body.pendingPayments
    : undefined;
  const result = await ActivityService.advanceStatus(id, scope, {
    pendingPayments,
    applyCustomerBalance: parseOptionalBoolean(body.applyCustomerBalance),
  });
  res.status(HttpStatusCodes.OK).json(result);
}

async function delete_(req: Req, res: Res) {
  const { id } = reqValidators.delete(req.params);
  const sessionUser = res.locals.sessionUser as ISessionUser;
  const scope = await resolveEmployeeDataScope(sessionUser);
  await ActivityService.delete(id, scope);
  res.status(HttpStatusCodes.OK).end();
}

/******************************************************************************
                                Export default
******************************************************************************/

export default {
  getAll,
  exportExcel,
  getOne,
  add,
  update,
  confirm,
  advanceStatus,
  delete: delete_,
} as const;
