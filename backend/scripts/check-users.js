require("dotenv").config({ path: "./config/.env.development" });
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const SALT_ROUNDS = 12;
const DEFAULT_PASSWORD = "123456";

const TARGET_USERS = [
  { username: "admin", role: "admin" },
  { username: "nhanvien01", role: "employee" },
  { username: "nhanvien02", role: "employee" },
];

async function main() {
  const client = await pool.connect();
  try {
    const { rows: tables } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name ILIKE '%refresh%'
    `);
    console.log("Refresh token tables:", tables.map((t) => t.table_name).join(", ") || "(none)");

    const { rows: users } = await client.query(
      `SELECT user_id, username, role,
              LEFT(password, 7) AS pwd_prefix,
              LENGTH(password) AS pwd_len
       FROM users
       WHERE deleted_at IS NULL
       ORDER BY user_id`,
    );
    console.log("\nUsers in database:");
    console.table(users);

    const hashed = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
    for (const { username, role } of TARGET_USERS) {
      const { rows: existing } = await client.query(
        "SELECT user_id FROM users WHERE username = $1",
        [username],
      );
      if (existing.length > 0) {
        await client.query(
          "UPDATE users SET password = $1, role = $2, updated_at = NOW() WHERE username = $3",
          [hashed, role, username],
        );
        console.log(`Updated password (bcrypt): ${username}`);
      } else {
        console.log(`Missing user: ${username} (not created)`);
      }
    }

    console.log(`\nLogin with password: ${DEFAULT_PASSWORD}`);
    console.log("Usernames:", TARGET_USERS.map((u) => u.username).join(", "));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
