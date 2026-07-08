import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import OrderStatusService from '@src/services/OrderStatusService';

import { Req, Res } from './common/express-types';

async function getAll(_: Req, res: Res) {
  const statuses = await OrderStatusService.getAll();
  res.status(HttpStatusCodes.OK).json({ statuses });
}

export default {
  getAll,
} as const;
