/**
 * Đồng bộ xã/phường Thành phố Cần Thơ từ Province Open API v2.
 * @see https://provinces.open-api.vn/
 */
require("dotenv/config");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const PROVINCES_API_V2_BASE = "https://provinces.open-api.vn/api/v2";
const CAN_THO_PROVINCE_CODE = 92;
const CAN_THO_PROVINCE_NAME = "Thành phố Cần Thơ";
const WARD_DIVISION_TYPES = ["phường", "xã"];

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fetchCanThoWards() {
  const url = `${PROVINCES_API_V2_BASE}/p/${CAN_THO_PROVINCE_CODE}?depth=2`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Provinces API failed: ${response.status}`);
  }
  const province = await response.json();
  return province.wards.filter((w) => WARD_DIVISION_TYPES.includes(w.division_type));
}

async function main() {
  const wards = await fetchCanThoWards();
  let created = 0;
  let updated = 0;

  for (const ward of wards) {
    const existing = await prisma.location.findUnique({
      where: { ward_code: ward.code },
    });

    if (existing) {
      await prisma.location.update({
        where: { ward_code: ward.code },
        data: { province: CAN_THO_PROVINCE_NAME, ward: ward.name },
      });
      updated++;
    } else {
      await prisma.location.create({
        data: {
          province: CAN_THO_PROVINCE_NAME,
          ward: ward.name,
          ward_code: ward.code,
        },
      });
      created++;
    }
  }

  console.log("Can Tho locations synced:", {
    total: wards.length,
    created,
    updated,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
