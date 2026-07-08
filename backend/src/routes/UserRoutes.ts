import { isNonEmptyString, isNumber, isString } from 'jet-validators';
import { transform } from 'jet-validators/utils';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import User from '@src/models/User.model';
import UserService from '@src/services/UserService';

import { Req, Res } from './common/express-types';
import parseReq from './common/parseReq';
import UserModel from '@src/models/User.model';
import { RouteError } from '@src/common/utils/route-errors';
import { ISessionUser } from '@src/models/common/types';
import {
  assertOwnUserStatsAccess,
  assertSellerStatsAccess,
  parseSellerScope,
} from '@src/services/stats-access';
import { parseStatsPeriodQuery } from '@src/common/utils/stats-period';
import type { SellerScope } from '@src/repos/UserRepo';
import { NextFunction } from 'express';

/******************************************************************************
                                   Constants
******************************************************************************/

const reqValidators = {
  add: parseReq({ user: User.newCreate }),
  update: parseReq({ user: User.isComplete }),
  getOne: parseReq({ username: transform(String, isString) }),
  delete: parseReq({ id: transform(Number, isNumber) }),
  search: parseReq({ query: isString }),
  authenticate: parseReq({ 
    username: isNonEmptyString, 
    password: isNonEmptyString 
  }),
  getStats: parseReq({ userId: transform(Number, isNumber) }),
  getStatsScope: parseReq({ userId: transform(String, isString) }),
  // Validator for parsing optional query strings along with the userId parameter
  getMonthlyStats: parseReq({
    userId: transform(Number, isNumber),
    month: transform((val) => (val !== undefined ? Number(val) : undefined), (val) => val === undefined || isNumber(val)),
    year: transform((val) => (val !== undefined ? Number(val) : undefined), (val) => val === undefined || isNumber(val)),
  }),
  getMonthlyStatsScope: parseReq({
    userId: transform(String, isString),
    month: transform((val) => (val !== undefined ? Number(val) : undefined), (val) => val === undefined || isNumber(val)),
    year: transform((val) => (val !== undefined ? Number(val) : undefined), (val) => val === undefined || isNumber(val)),
  }),
  getMapStats: parseReq({
      date: isNonEmptyString,
  }),
} as const;

function resolveSellerScope(req: Req, res: Res): SellerScope {
  const { userId } = reqValidators.getStatsScope(req.params);
  const sessionUser = res.locals.sessionUser as ISessionUser;
  const scope = parseSellerScope(userId);
  assertSellerStatsAccess(sessionUser, scope);
  return scope;
}

function readSellerStatsQuery(req: Req) {
  const period = parseStatsPeriodQuery(req.query);
  const province = typeof req.query.province === 'string' ? req.query.province : undefined;
  const ward = typeof req.query.ward === 'string' ? req.query.ward : undefined;
  return { ...period, province, ward };
}

function sendStatsJson(res: Res, payload: unknown) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.status(HttpStatusCodes.OK).json(payload);
}

function resolveOwnUserId(req: Req, res: Res): number {
  const { userId } = reqValidators.getStats(req.params);
  const sessionUser = res.locals.sessionUser as ISessionUser;
  assertOwnUserStatsAccess(sessionUser, userId);
  return userId;
}

/******************************************************************************
                                   Functions
******************************************************************************/


/**
 * Hồ sơ user đang đăng nhập.
 * @route GET /api/users/profile
 */
async function getProfile(req: Req, res: Res) {
  const sessionUser = res.locals.sessionUser as ISessionUser;
  if (!sessionUser?.username) {
    throw new RouteError(HttpStatusCodes.UNAUTHORIZED, 'Invalid session');
  }
  const userProfile = await UserService.getOne(sessionUser.username);
  if (!userProfile) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, 'User profile not found');
  }
  return res.status(HttpStatusCodes.OK).json({ user: userProfile });
}

/**
 * Get one user by id (admin).
 * @route GET /api/users/:id
 */
async function getOne(req: Req, res: Res, next: NextFunction) {
  try {
    const { id } = reqValidators.delete(req.params);
    const users = await UserService.getAll();
    const user = users.find((u) => u.id === id);
    
    if (!user) {
      throw new RouteError(HttpStatusCodes.NOT_FOUND, 'User not found');
    }
    
    return res.status(HttpStatusCodes.OK).json({ user });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get all users.
 * @route GET /api/users/all
 */
async function getAll(_: Req, res: Res, next: NextFunction) {
  try {
    const users = await UserService.getAll();
    return res.status(HttpStatusCodes.OK).json({ users });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get all unactivated users.
 * @route GET /api/users/unactivated
 */
async function getAllUnactivated(_: Req, res: Res, next: NextFunction) {
  try {
    const users = await UserService.getAllUnactivated();
    return res.status(HttpStatusCodes.OK).json({ users });
  } catch (error) {
    return next(error);
  }
}

/**
 * Search users by full_name, username, department, email, or phone_number.
 * @route GET /api/users/search?query=...
 */
async function search(req: Req, res: Res, next: NextFunction) {
  try {
    const { query } = reqValidators.search(req.query);
    const users = await UserService.search(query);
    return res.status(HttpStatusCodes.OK).json({ users });
  } catch (error) {
    return next(error);
  }
}

/**
 * Add one user.
 * @route POST /api/users/add
 */
async function add(req: Req, res: Res, next: NextFunction) {
  try {
    const validatedUser = UserModel.newCreate(req.body.user);
    const created = await UserService.addOne(validatedUser);
    return res.status(HttpStatusCodes.CREATED).json({ user: created });
  } catch (error) {
    return next(error);
  }
}

/**
 * Update one user.
 * @route PUT /api/users/update
 */
async function update(req: Req, res: Res, next: NextFunction) {
  try {
    const { user } = reqValidators.update(req.body);
    const updated = await UserService.updateOne(user);
    return res.status(HttpStatusCodes.OK).json({ user: updated });
  } catch (error) {
    return next(error);
  }
}

/**
 * Delete one user (Soft delete).
 * @route DELETE /api/users/delete/:id
 */
async function delete_(req: Req, res: Res, next: NextFunction) {
  try {
    const { id } = reqValidators.delete(req.params);
    await UserService.delete(id);
    return res.status(HttpStatusCodes.OK).end();
  } catch (error) {
    return next(error);
  }
}
/******************************************************************************
                             Employee Statistics Routes
******************************************************************************/

/**
 * Get overview of employee performance metrics and KPIs.
 * @route GET /api/users/stats/overview/:userId
 */
async function getOverviewStats(req: Req, res: Res) {
  const { userId } = reqValidators.getStats(req.params);
  const stats = await UserService.getEmployeeOverviewStats(userId);
  res.status(HttpStatusCodes.OK).json(stats);
}

/**
 * Get detailed monthly productivity and target metrics for an employee.
 * @route GET /api/users/stats/monthly/:userId?month=...&year=...
 */
async function getMonthlyStats(req: Req, res: Res) {
  const { userId, month, year } = reqValidators.getMonthlyStats({ ...req.params, ...req.query });
  const stats = await UserService.getEmployeeMonthlyStats(userId, month, year);
  res.status(HttpStatusCodes.OK).json(stats);
}

/**
 * Get employee sales revenue broken down by territory (Location).
 * @route GET /api/users/stats/locations/:userId
 */
async function getLocationStats(req: Req, res: Res) {
  const scope = resolveSellerScope(req, res);
  const { month, year, date, province, ward } = readSellerStatsQuery(req);
  const stats = await UserService.getEmployeeLocationStats(
    scope,
    month ?? 'all',
    year ?? 'all',
    province,
    ward,
    date,
  );
  sendStatsJson(res, stats);
}

/**
 * Get the top 5 best-selling products for a specific employee.
 * @route GET /api/users/stats/top-products/:userId
 */
async function getTopProducts(req: Req, res: Res) {
  const { userId } = reqValidators.getStats(req.params);
  const stats = await UserService.getEmployeeTopProducts(userId);
  res.status(HttpStatusCodes.OK).json({ products: stats });
}

/**
 * Get the current sales funnel status distribution breakdown for an employee.
 * @route GET /api/users/stats/status-breakdown/:userId
 */
async function getStatusBreakdown(req: Req, res: Res) {
  const scope = resolveSellerScope(req, res);
  const { month, year, date, province, ward } = readSellerStatsQuery(req);
  const stats = await UserService.getEmployeeStatusBreakdown(
    scope,
    month ?? 'all',
    year ?? 'all',
    province,
    ward,
    date,
  );
  sendStatsJson(res, stats);
}

/**
 * Get the chronological history timeline of recent successful sales activities.
 * @route GET /api/users/stats/recent-sales/:userId
 */
async function getRecentSalesTimeline(req: Req, res: Res) {
  const scope = resolveSellerScope(req, res);
  const { month, year, date, province, ward } = readSellerStatsQuery(req);
  const stats = await UserService.getEmployeeRecentSalesTimeline(
    scope,
    month ?? 'all',
    year ?? 'all',
    province,
    ward,
    date,
  );
  sendStatsJson(res, stats);
}

/******************************************************************************
                             Seller Role Statistics Routes
******************************************************************************/

/**
 * [SELLER] Get overview metrics of signed contracts and managed customer outstanding debts.
 * @route GET /api/users/stats/seller/overview/:userId
 */
async function getSellerOverviewStats(req: Req, res: Res) {
  const scope = resolveSellerScope(req, res);
  const { month, year, date, province, ward } = readSellerStatsQuery(req);
  const stats = await UserService.getSellerOverviewStats(
    scope,
    month ?? 'all',
    year ?? 'all',
    province,
    ward,
    date,
  );
  sendStatsJson(res, stats);
}

/**
 * [SELLER] Revenue series by day (month filter) or by month (year filter) for stacked charts.
 * @route GET /api/users/stats/seller/revenue-series/:userId
 */
async function getSellerRevenueSeries(req: Req, res: Res) {
  const scope = resolveSellerScope(req, res);
  const { month, year, province, ward } = readSellerStatsQuery(req);
  if (!year) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, 'Thiếu tham số year');
  }
  const stats = await UserService.getSellerRevenueSeries(
    scope,
    year,
    month ?? 'all',
    province,
    ward,
  );
  sendStatsJson(res, stats);
}

/**
 * [SELLER] Get monthly contract volume and pending revenue growth analytics.
 * @route GET /api/users/stats/seller/monthly/:userId
 */
async function getSellerMonthlyStats(req: Req, res: Res) {
  const { userId } = reqValidators.getStats(req.params);
  const month = req.query.month ? parseInt(req.query.month as string) : undefined;
  const year = req.query.year ? parseInt(req.query.year as string) : undefined;
  const stats = await UserService.getSellerMonthlyStats(userId, month, year);
  res.status(HttpStatusCodes.OK).json(stats);
}

/**
 * [SELLER] Get top 5 clients holding the highest outstanding financial accounts.
 * @route GET /api/users/stats/seller/top-debtors/:userId
 */
async function getEmployeeTopDebtors(req: Req, res: Res) {
  const scope = resolveSellerScope(req, res);
  const { province, ward } = req.query as Record<string, string>;
  const stats = await UserService.getEmployeeTopDebtors(scope, province, ward);
  res.status(HttpStatusCodes.OK).json(stats);
}


/******************************************************************************
                             Shipper Role Statistics Routes
******************************************************************************/

/**
 * [SHIPPER] Get overall delivery trip stats and total physical COD cash collected.
 * @route GET /api/users/stats/shipper/overview/:userId
 */
async function getShipperOverviewStats(req: Req, res: Res) {
  const userId = resolveOwnUserId(req, res);
  const { month, year, date } = parseStatsPeriodQuery(req.query);
  const stats = await UserService.getShipperOverviewStats(userId, month, year, date);
  sendStatsJson(res, stats);
}

/**
 * [SHIPPER] Get monthly tracking data for successful handovers and aggregated cash returns.
 * @route GET /api/users/stats/shipper/monthly/:userId?month=...&year=...
 */
async function getShipperMonthlyStats(req: Req, res: Res) {
  const { userId, month, year } = reqValidators.getMonthlyStats({ ...req.params, ...req.query });
  const { date } = parseStatsPeriodQuery(req.query);
  const sessionUser = res.locals.sessionUser as ISessionUser;
  assertOwnUserStatsAccess(sessionUser, userId);
  const stats = await UserService.getShipperMonthlyStats(userId, month, year, date);
  sendStatsJson(res, stats);
}

/**
 * [MAP] Get territory scheduling status and employee-province assignments for a specific date.
 * @route GET /api/activities/stats/map?date=...
 */
async function getMapStatus(req: Req, res: Res) {
  const { date } = reqValidators.getMapStats(req.query);
  
  const sessionUser = res.locals.sessionUser as ISessionUser;
  // if (sessionUser.role !== 'admin') {
  //   throw new RouteError(HttpStatusCodes.FORBIDDEN, 'Access denied. Management privileges required.');
  // }

  const mapData = await UserService.getMapStatusByActivities(date);
  
  return res.status(HttpStatusCodes.OK).json(mapData);
}

/******************************************************************************
                                   Export default
******************************************************************************/

export default {
  getProfile,
  getOne,
  getAll,
  getAllUnactivated,
  search,
  add,
  update,
  delete: delete_,

  getOverviewStats,
  getMonthlyStats,
  getLocationStats,
  getTopProducts,
  getStatusBreakdown,
  getRecentSalesTimeline,
  getSellerOverviewStats,
  getSellerRevenueSeries,
  getSellerMonthlyStats,
  getEmployeeTopDebtors,
  getShipperOverviewStats,
  getShipperMonthlyStats,
  getMapStatus
} as const;