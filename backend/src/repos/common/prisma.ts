import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

import EnvVars from '@src/common/constants/env';

const pool = new Pool({ connectionString: EnvVars.DatabaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
export default prisma;
