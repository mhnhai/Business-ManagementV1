import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { EmployeeLocationErrors as Errors } from '@src/common/constants/service-errors';
import { RouteError } from '@src/common/utils/route-errors';
import type {
  IEmployeeLocationView,
} from '@src/models/EmployeeLocation.model';
import type { ILocation } from '@src/models/Location.model';
import EmployeeLocationRepo from '@src/repos/EmployeeLocationRepo';
import LocationRepo from '@src/repos/LocationRepo';
import UserRepo from '@src/repos/UserRepo';
import prisma from '@src/repos/common/prisma';

/******************************************************************************
                                   Helpers
******************************************************************************/

function assertUniqueLocationIds(locationIds: number[]): number[] {
  const uniqueIds = [...new Set(locationIds)];
  if (uniqueIds.length !== locationIds.length) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, Errors.DUPLICATE_LOCATION_IDS);
  }
  return uniqueIds;
}

async function assertUserExists(userId: number): Promise<void> {
  if (!(await UserRepo.persists(userId))) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.USER_NOT_FOUND);
  }
}

async function assertLocationsExist(locationIds: number[]): Promise<void> {
  for (const locationId of locationIds) {
    if (!(await LocationRepo.persists(locationId))) {
      throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.LOCATION_NOT_FOUND);
    }
  }
}

async function assertLocationsNotAssignedToOthers(
  userId: number,
  locationIds: number[],
): Promise<void> {
  if (locationIds.length === 0) {
    return;
  }

  const conflicts = await prisma.employeeLocation.findMany({
    where: {
      location_id: { in: locationIds },
      user_id: { not: userId },
    },
    select: { location_id: true },
  });

  if (conflicts.length > 0) {
    throw new RouteError(
      HttpStatusCodes.CONFLICT,
      Errors.LOCATION_ALREADY_ASSIGNED,
    );
  }
}

/******************************************************************************
                                   Functions
******************************************************************************/

async function getAll(): Promise<IEmployeeLocationView[]> {
  return EmployeeLocationRepo.getAll();
}

async function getByUserId(userId: number): Promise<IEmployeeLocationView[]> {
  await assertUserExists(userId);
  return EmployeeLocationRepo.getByUserId(userId);
}

async function getAvailableLocations(): Promise<ILocation[]> {
  return EmployeeLocationRepo.getAvailableLocations();
}

async function setUserLocations(
  userId: number,
  locationIds: number[],
): Promise<IEmployeeLocationView[]> {
  await assertUserExists(userId);
  const uniqueIds = assertUniqueLocationIds(locationIds);
  await assertLocationsExist(uniqueIds);
  await assertLocationsNotAssignedToOthers(userId, uniqueIds);
  return EmployeeLocationRepo.setUserLocations(userId, uniqueIds);
}

async function assign(
  userId: number,
  locationId: number,
): Promise<IEmployeeLocationView> {
  await assertUserExists(userId);
  if (!(await LocationRepo.persists(locationId))) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.LOCATION_NOT_FOUND);
  }
  await assertLocationsNotAssignedToOthers(userId, [locationId]);

  const alreadyAssigned = await EmployeeLocationRepo.assignmentExists(
    userId,
    locationId,
  );
  if (alreadyAssigned) {
    return EmployeeLocationRepo.getByUserId(userId).then(
      (rows) => rows.find((row) => row.locationId === locationId)!,
    );
  }

  return EmployeeLocationRepo.assign(userId, locationId);
}

async function unassign(userId: number, locationId: number): Promise<void> {
  await assertUserExists(userId);
  const exists = await EmployeeLocationRepo.assignmentExists(userId, locationId);
  if (!exists) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.ASSIGNMENT_NOT_FOUND);
  }
  return EmployeeLocationRepo.unassign(userId, locationId);
}

/******************************************************************************
                                Export default
******************************************************************************/

export default {
  Errors,
  getAll,
  getByUserId,
  getAvailableLocations,
  setUserLocations,
  assign,
  unassign,
} as const;
