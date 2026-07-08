import { CAN_THO_PROVINCE_NAME } from '@src/common/constants/provinces-api';
import {
  fetchCanThoWards,
  wardToLocationFields,
} from '@src/common/services/provinces-api';
import { ILocation } from '@src/models/Location.model';

import { locationToPrismaData, toLocation } from './common/mappers';
import prisma from './common/prisma';

/******************************************************************************
                                Functions
******************************************************************************/

async function getOne(id: number): Promise<ILocation | null> {
  const row = await prisma.location.findUnique({ where: { location_id: id } });
  return row ? toLocation(row) : null;
}

async function getByWardCode(wardCode: number): Promise<ILocation | null> {
  const row = await prisma.location.findUnique({ where: { ward_code: wardCode } });
  return row ? toLocation(row) : null;
}

async function persists(id: number): Promise<boolean> {
  const count = await prisma.location.count({ where: { location_id: id } });
  return count > 0;
}

async function getAll(): Promise<ILocation[]> {
  const rows = await prisma.location.findMany({
    where: { province: CAN_THO_PROVINCE_NAME },
    orderBy: { ward: 'asc' },
  });
  return rows.map(toLocation);
}

async function add(location: ILocation): Promise<ILocation> {
  const row = await prisma.location.create({
    data: locationToPrismaData(location),
  });
  return toLocation(row);
}

async function update(location: ILocation): Promise<ILocation> {
  const row = await prisma.location.update({
    where: { location_id: location.id },
    data: locationToPrismaData(location),
  });
  return toLocation(row);
}

async function delete_(id: number): Promise<void> {
  await prisma.location.delete({ where: { location_id: id } });
}

async function countCustomersByLocation(locationId: number): Promise<number> {
  return prisma.customer.count({ where: { location_id: locationId } });
}

async function countEmployeeAssignments(locationId: number): Promise<number> {
  return prisma.employeeLocation.count({ where: { location_id: locationId } });
}

async function syncCanThoFromApi(): Promise<{ created: number; skipped: number }> {
  const wards = await fetchCanThoWards();
  let created = 0;
  let skipped = 0;

  for (const ward of wards) {
    const fields = wardToLocationFields(ward);
    const existing = await prisma.location.findUnique({
      where: { ward_code: fields.wardCode },
    });

    if (existing) {
      await prisma.location.update({
        where: { ward_code: fields.wardCode },
        data: { province: fields.province, ward: fields.ward },
      });
      skipped++;
      continue;
    }

    await prisma.location.create({
      data: locationToPrismaData({
        province: fields.province,
        ward: fields.ward,
        wardCode: fields.wardCode,
      }),
    });
    created++;
  }

  return { created, skipped };
}

/******************************************************************************
                                Export default
******************************************************************************/

export default {
  getOne,
  getByWardCode,
  persists,
  getAll,
  add,
  update,
  delete: delete_,
  countCustomersByLocation,
  countEmployeeAssignments,
  syncCanThoFromApi,
} as const;
