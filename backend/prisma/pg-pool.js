const { Pool } = require("pg");

function createPgPool(connectionString) {
  const url = new URL(connectionString);
  const useSsl =
    url.hostname.includes("supabase.co") ||
    ["require", "verify-full", "verify-ca", "prefer"].includes(
      url.searchParams.get("sslmode") ?? "",
    );

  for (const param of [
    "sslmode",
    "sslaccept",
    "sslrootcert",
    "uselibpqcompat",
  ]) {
    url.searchParams.delete(param);
  }

  const config = { connectionString: url.toString() };
  if (useSsl) {
    config.ssl = { rejectUnauthorized: false };
  }

  return new Pool(config);
}

module.exports = { createPgPool };
