import OrderStatusRepo from '@src/repos/OrderStatusRepo';
import { toOrderStatus } from '@src/repos/common/mappers';

async function getAll() {
  const rows = await OrderStatusRepo.getAll();
  return rows.map(toOrderStatus);
}

export default {
  getAll,
} as const;
