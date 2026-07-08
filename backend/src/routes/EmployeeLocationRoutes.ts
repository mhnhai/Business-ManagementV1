import { isNumber, isUnsignedInteger } from 'jet-validators';
import { transform } from 'jet-validators/utils';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { Roles } from '@src/common/constants/roles';
import { RouteError } from '@src/common/utils/route-errors';
import type { ISessionUser } from '@src/models/common/types';
import EmployeeLocationService from '@src/services/EmployeeLocationService';
import { assertOwnUserStatsAccess } from '@src/services/stats-access';

import { Req, Res } from './common/express-types';
import parseReq from './common/parseReq';

/******************************************************************************
                                   Constants
******************************************************************************/

const reqValidators = {
  byUser: parseReq({ userId: transform(Number, isNumber) }),
  byUserAndLocation: parseReq({
    userId: transform(Number, isNumber),
    locationId: transform(Number, isNumber),
  }),
  setByUser: parseReq({
    locationIds: (val: unknown): val is number[] =>
      Array.isArray(val) && val.every((id) => isUnsignedInteger(id)),
  }),
  assign: parseReq({
    userId: transform(Number, isNumber),
    locationId: transform(Number, isNumber),
  }),
} as const;

function assertAdmin(sessionUser: ISessionUser): void {
  if (sessionUser.role !== Roles.ADMIN) {
    throw new RouteError(HttpStatusCodes.FORBIDDEN, 'Permission denied');
  }
}

/******************************************************************************
                                   Functions
******************************************************************************/

/**
 * Get all employee zone assignments (Admin only).
 * @route GET /api/employee-locations/all
 */
async function getAll(_: Req, res: Res) {
  assertAdmin(res.locals.sessionUser as ISessionUser);
  const assignments = await EmployeeLocationService.getAll();
  res.status(HttpStatusCodes.OK).json({ assignments });
}

/**
 * Get locations not yet assigned to any employee (Admin only).
 * @route GET /api/employee-locations/available
 */
async function getAvailable(_: Req, res: Res) {
  assertAdmin(res.locals.sessionUser as ISessionUser);
  const locations = await EmployeeLocationService.getAvailableLocations();
  res.status(HttpStatusCodes.OK).json({ locations });
}

/**
 * Get zone assignments for one employee.
 * @route GET /api/employee-locations/user/:userId
 */
async function getByUserId(req: Req, res: Res) {
  const sessionUser = res.locals.sessionUser as ISessionUser;
  const { userId } = reqValidators.byUser(req.params);
  assertOwnUserStatsAccess(sessionUser, userId);
  const assignments = await EmployeeLocationService.getByUserId(userId);
  res.status(HttpStatusCodes.OK).json({ assignments });
}

/**
 * Replace all zone assignments for one employee (Admin only).
 * @route PUT /api/employee-locations/user/:userId
 */
async function setByUserId(req: Req, res: Res) {
  assertAdmin(res.locals.sessionUser as ISessionUser);
  const { userId } = reqValidators.byUser(req.params);
  const { locationIds } = reqValidators.setByUser(req.body);
  const assignments = await EmployeeLocationService.setUserLocations(
    userId,
    locationIds,
  );
  res.status(HttpStatusCodes.OK).json({ assignments });
}

/**
 * Assign one location to an employee (Admin only).
 * @route POST /api/employee-locations/assign
 */
async function assign(req: Req, res: Res) {
  assertAdmin(res.locals.sessionUser as ISessionUser);
  const { userId, locationId } = reqValidators.assign(req.body);
  const assignment = await EmployeeLocationService.assign(userId, locationId);
  res.status(HttpStatusCodes.CREATED).json({ assignment });
}

/**
 * Remove one zone assignment (Admin only).
 * @route DELETE /api/employee-locations/user/:userId/:locationId
 */
async function unassign(req: Req, res: Res) {
  assertAdmin(res.locals.sessionUser as ISessionUser);
  const { userId, locationId } = reqValidators.byUserAndLocation(req.params);
  await EmployeeLocationService.unassign(userId, locationId);
  res.status(HttpStatusCodes.OK).end();
}

/******************************************************************************
                                 Export default
******************************************************************************/

export default {
  getAll,
  getAvailable,
  getByUserId,
  setByUserId,
  assign,
  unassign,
} as const;
