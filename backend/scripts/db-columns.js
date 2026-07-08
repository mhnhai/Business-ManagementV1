require("dotenv").config({ path: "./config/.env.development" });
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  for (const table of ["users", "activities", "invoices", "payments"]) {
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
      [table],
    );
    console.log(`${table}:`, rows.map((r) => r.column_name).join(", "));
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
