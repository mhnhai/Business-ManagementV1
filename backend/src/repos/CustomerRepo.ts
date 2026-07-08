import { ICustomer, ICustomerUpdate, ICustomerWrite } from '@src/models/Customer.model';

import { customerToPrismaData, toCustomer } from './common/mappers';
import prisma from './common/prisma';
import { Customer } from '@prisma/client';

/******************************************************************************
                                Functions
******************************************************************************/

async function getOne(id: number): Promise<ICustomer | null> {
  const row = await prisma.customer.findUnique({
    where: { customer_id: id },
  });
  return row ? toCustomer(row) : null;
}

async function persists(id: number): Promise<boolean> {
  const count = await prisma.customer.count({ where: { customer_id: id } });
  return count > 0;
}

async function getAll(locationIds?: number[]): Promise<ICustomer[]> {
  const rows = await prisma.customer.findMany({
    where: {
      is_approved: true,
      ...(locationIds !== undefined
        ? { location_id: { in: locationIds } }
        : {}),
    },
    orderBy: { customer_id: 'asc' },
  });
  return rows.map(toCustomer);
}

async function getOneInTerritory(
  id: number,
  locationIds?: number[],
): Promise<ICustomer | null> {
  const row = await prisma.customer.findFirst({
    where: {
      customer_id: id,
      ...(locationIds !== undefined
        ? { location_id: { in: locationIds } }
        : {}),
    },
  });
  return row ? toCustomer(row) : null;
}

async function getPendingApproval(): Promise<ICustomer[]> {
  const rows = await prisma.customer.findMany({
    where: { is_approved: false }, 
    orderBy: { created_at: 'desc' }, 
  });
  return rows.map(toCustomer);
}

async function add(customer: ICustomerWrite): Promise<ICustomer> {
  const row = await prisma.customer.create({
    data: customerToPrismaData(customer),
  });
  return toCustomer(row);
}

async function update(customer: ICustomerUpdate | ICustomer): Promise<ICustomer> {
  const row = await prisma.customer.update({
    where: { customer_id: customer.id },
    data: customerToPrismaData(customer),
  });
  return toCustomer(row);
}

async function delete_(id: number): Promise<void> {
  await prisma.customer.delete({ where: { customer_id: id } });
}


async function getNearby(lat: number, lng: number, radiusInKm: number): Promise<ICustomer[]> {
  const rows = await prisma.$queryRaw<(Customer & { distance: number })[]>`
    SELECT *, 
      (6371 * acos(cos(radians(${lat})) * cos(radians(lat)) * cos(radians(lng) - radians(${lng})) + sin(radians(${lat})) * sin(radians(lat)))) AS distance 
    FROM customers
    WHERE is_approved = true
    HAVING distance < ${radiusInKm}
    ORDER BY distance ASC
  `;
  
  return rows.map((row) => toCustomer(row));
}

/******************************************************************************
                                Export default
******************************************************************************/

export default {
  getOne,
  getOneInTerritory,
  persists,
  getAll,
  getPendingApproval, 
  getNearby,        
  add,
  update,
  delete: delete_,
} as const;