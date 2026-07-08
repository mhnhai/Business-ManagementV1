require("dotenv").config({ path: "./config/.env.development" });
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const ORDER_STATUSES = [
  { status_code: "draft", status_name: "Nháp", sort_order: 1, is_terminal: false },
  {
    status_code: "confirmed",
    status_name: "Đã xác nhận",
    sort_order: 2,
    is_terminal: false,
  },
  {
    status_code: "processing",
    status_name: "Đang xử lý",
    sort_order: 3,
    is_terminal: false,
  },
  {
    status_code: "completed",
    status_name: "Hoàn thành",
    sort_order: 4,
    is_terminal: true,
  },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    for (const row of ORDER_STATUSES) {
      await prisma.orderStatus.upsert({
        where: { status_code: row.status_code },
        create: row,
        update: {
          status_name: row.status_name,
          sort_order: row.sort_order,
          is_terminal: row.is_terminal,
        },
      });
    }
    const all = await prisma.orderStatus.findMany({
      orderBy: { sort_order: "asc" },
    });
    console.log("order_statuses:", all);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
