/**
 * Chèn dữ liệu lương mẫu nếu bảng salaries đang trống (không xóa dữ liệu khác).
 * Chạy: node scripts/seed-salaries-if-empty.js
 */
require("dotenv").config({ path: "./config/.env.development" });
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const year = 2026;
const months = [3, 4, 5];
const templates = {
  admin: [
    { base: 25000000, commission: 0, bonus: 2000000 },
    { base: 25000000, commission: 0, bonus: 2500000 },
    { base: 25000000, commission: 0, bonus: 3000000 },
  ],
  nhanvien01: [
    { base: 12000000, commission: 1800000, bonus: 500000 },
    { base: 12000000, commission: 2200000, bonus: 700000 },
    { base: 12000000, commission: 3100000, bonus: 1000000 },
  ],
  nhanvien02: [
    { base: 11500000, commission: 1500000, bonus: 400000 },
    { base: 11500000, commission: 1900000, bonus: 600000 },
    { base: 11500000, commission: 2400000, bonus: 800000 },
  ],
};

async function main() {
  const count = await prisma.salary.count();
  if (count > 0) {
    console.log(`salaries đã có ${count} bản ghi — bỏ qua.`);
    return;
  }

  const users = await prisma.user.findMany({
    where: { username: { in: Object.keys(templates) }, deleted_at: null },
  });
  if (users.length === 0) {
    throw new Error("Không tìm thấy user admin/nhanvien01/nhanvien02. Chạy seed đầy đủ trước.");
  }

  const byUsername = Object.fromEntries(users.map((u) => [u.username, u]));
  let created = 0;

  for (let i = 0; i < months.length; i++) {
    const month = months[i];
    for (const [username, rows] of Object.entries(templates)) {
      const user = byUsername[username];
      if (!user) {
        console.warn(`Bỏ qua ${username} — không có trong DB`);
        continue;
      }
      const row = rows[i];
      await prisma.salary.create({
        data: {
          user_id: user.user_id,
          month,
          year,
          base_salary: row.base.toFixed(2),
          commission: row.commission.toFixed(2),
          bonus: row.bonus.toFixed(2),
        },
      });
      created += 1;
    }
  }

  console.log(`Đã tạo ${created} bản ghi lương (tháng 3–5/${year}).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
