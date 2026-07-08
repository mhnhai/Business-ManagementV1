import prisma from './common/prisma';

/******************************************************************************
                                Functions
******************************************************************************/

async function getAll() {
  return prisma.orderStatus.findMany({ orderBy: { sort_order: 'asc' } });
}

async function getByCode(statusCode: string) {
  return prisma.orderStatus.findUnique({ where: { status_code: statusCode } });
}

async function getNext(statusCode: string) {
  const current = await getByCode(statusCode);
  if (!current) return null;
  return prisma.orderStatus.findFirst({
    where: { sort_order: { gt: current.sort_order } },
    orderBy: { sort_order: 'asc' },
  });
}

/******************************************************************************
                                Export default
******************************************************************************/

export default {
  getAll,
  getByCode,
  getNext,
} as const;
