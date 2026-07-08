import { Roles } from '@src/common/constants/roles';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { ActivityErrors } from '@src/common/constants/service-errors';
import { RouteError } from '@src/common/utils/route-errors';
import type { ISessionUser } from '@src/models/common/types';
import EmployeeLocationRepo from '@src/repos/EmployeeLocationRepo';
import ActivityRepo from '@src/repos/ActivityRepo';

export type EmployeeDataScope =
  | { mode: 'all' }
  | { mode: 'employee'; userId: number; locationIds: number[] };

export async function resolveEmployeeDataScope(
  sessionUser: ISessionUser,
): Promise<EmployeeDataScope> {
  if (sessionUser.role === Roles.ADMIN) {
    return { mode: 'all' };
  }

  const locationIds = await EmployeeLocationRepo.getLocationIdsByUserId(
    sessionUser.userId,
  );

  return {
    mode: 'employee',
    userId: sessionUser.userId,
    locationIds,
  };
}

export function assertCustomerInScope(
  scope: EmployeeDataScope,
  locationId: number,
): void {
  if (scope.mode === 'all') {
    return;
  }
  if (!scope.locationIds.includes(locationId)) {
    throw new RouteError(
      HttpStatusCodes.FORBIDDEN,
      'Khách hàng không thuộc vùng được phân công',
    );
  }
}

export function assertActivityOwnedByScope(
  scope: EmployeeDataScope,
  activityUserId: number,
): void {
  if (scope.mode === 'all') {
    return;
  }
  if (activityUserId !== scope.userId) {
    throw new RouteError(HttpStatusCodes.FORBIDDEN, 'Permission denied');
  }
}

export async function assertActivityAccess(
  activityId: number,
  scope: EmployeeDataScope,
) {
  const activity = await ActivityRepo.getOne(activityId);
  if (!activity) {
    throw new RouteError(
      HttpStatusCodes.NOT_FOUND,
      ActivityErrors.ACTIVITY_NOT_FOUND,
    );
  }
  assertActivityOwnedByScope(scope, activity.userId);
  return activity;
}
