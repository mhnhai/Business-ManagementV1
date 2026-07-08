import { CAN_THO_PROVINCE_NAME } from '@src/common/constants/provinces-api';
import type {
  IEmployeeLocationView,
} from '@src/models/EmployeeLocation.model';
import type { ILocation } from '@src/models/Location.model';

import {
  toEmployeeLocationView,
  toLocation,
} from './common/mappers';
import prisma from './common/prisma';

const assignmentInclude = {
  location: true,
  user: {
    select: {
      user_id: true,
      username: true,
      full_name: true,
      role: true,
      department: true,
    },
  },
} as const;

/******************************************************************************
                                Functions
******************************************************************************/

async function getAll(): Promise<IEmployeeLocationView[]> {
  const rows = await prisma.employeeLocation.findMany({
    include: assignmentInclude,
    orderBy: [{ user: { full_name: 'asc' } }, { location: { ward: 'asc' } }],
  });
  return rows.map(toEmployeeLocationView);
}

async function getByUserId(userId: number): Promise<IEmployeeLocationView[]> {
  const rows = await prisma.employeeLocation.findMany({
    where: { user_id: userId },
    include: assignmentInclude,
    orderBy: { location: { ward: 'asc' } },
  });
  return rows.map(toEmployeeLocationView);
}

async function getAvailableLocations(): Promise<ILocation[]> {
  const rows = await prisma.location.findMany({
    where: {
      province: CAN_THO_PROVINCE_NAME,
      employee_location: null,
    },
    orderBy: { ward: 'asc' },
  });
  return rows.map(toLocation);
}

async function getLocationIdsByUserId(userId: number): Promise<number[]> {
  const rows = await prisma.employeeLocation.findMany({
    where: { user_id: userId },
    select: { location_id: true },
    orderBy: { location_id: 'asc' },
  });
  return rows.map((row) => row.location_id);
}

async function assignmentExists(
  userId: number,
  locationId: number,
): Promise<boolean> {
  const count = await prisma.employeeLocation.count({
    where: { user_id: userId, location_id: locationId },
  });
  return count > 0;
}

async function countByLocation(locationId: number): Promise<number> {
  return prisma.employeeLocation.count({
    where: { location_id: locationId },
  });
}

async function setUserLocations(
  userId: number,
  locationIds: number[],
): Promise<IEmployeeLocationView[]> {
  await prisma.$transaction(async (tx) => {
    await tx.employeeLocation.deleteMany({ where: { user_id: userId } });

    if (locationIds.length === 0) {
      return;
    }

    await tx.employeeLocation.createMany({
      data: locationIds.map((locationId) => ({
        user_id: userId,
        location_id: locationId,
      })),
    });
  });

  return getByUserId(userId);
}

async function assign(
  userId: number,
  locationId: number,
): Promise<IEmployeeLocationView> {
  const row = await prisma.employeeLocation.create({
    data: { user_id: userId, location_id: locationId },
    include: assignmentInclude,
  });
  return toEmployeeLocationView(row);
}

async function unassign(userId: number, locationId: number): Promise<void> {
  await prisma.employeeLocation.delete({
    where: {
      user_id_location_id: {
        user_id: userId,
        location_id: locationId,
      },
    },
  });
}

/******************************************************************************
                                Export default
******************************************************************************/

export default {
  getAll,
  getByUserId,
  getAvailableLocations,
  getLocationIdsByUserId,
  assignmentExists,
  countByLocation,
  setUserLocations,
  assign,
  unassign,
} as const;
