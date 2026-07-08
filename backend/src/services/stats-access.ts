import { Roles } from '@src/common/constants/roles';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { RouteError } from '@src/common/utils/route-errors';
import type { ISessionUser } from '@src/models/common/types';
import type { SellerScope } from '@src/repos/UserRepo';

export type { SellerScope };

/**
 * `:userId` = số ID seller hoặc `all` (chỉ admin) để xem tổng hợp mọi seller.
 */
export function parseSellerScope(userIdParam: string): SellerScope {
  if (userIdParam === 'all') {
    return { mode: 'all' };
  }
  const sellerId = Number(userIdParam);
  if (!Number.isInteger(sellerId) || sellerId <= 0) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, 'Invalid user id');
  }
  return { mode: 'seller', sellerId };
}

export function assertSellerStatsAccess(
  sessionUser: ISessionUser,
  scope: SellerScope,
): void {
  if (sessionUser.role === Roles.ADMIN) {
    return;
  }
  if (scope.mode === 'all') {
    throw new RouteError(HttpStatusCodes.FORBIDDEN, 'Permission denied');
  }
  if (scope.sellerId !== sessionUser.userId) {
    throw new RouteError(HttpStatusCodes.FORBIDDEN, 'Permission denied');
  }
}

export function assertOwnUserStatsAccess(
  sessionUser: ISessionUser,
  userId: number,
): void {
  if (sessionUser.role === Roles.ADMIN) {
    return;
  }
  if (sessionUser.userId !== userId) {
    throw new RouteError(HttpStatusCodes.FORBIDDEN, 'Permission denied');
  }
}
