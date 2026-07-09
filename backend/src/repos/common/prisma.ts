import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { createPgPool } from '@src/common/utils/pg-pool';
import EnvVars from '@src/common/constants/env';

const pool = createPgPool(EnvVars.DatabaseUrl);
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
export default prisma;
