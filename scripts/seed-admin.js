// Upserts the bootstrap super admin from ADMIN_SEED_* env vars.
//
//   npm run db:seed-admin

const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

async function main() {
  const name = process.env.ADMIN_SEED_NAME || "Site Admin";
  const email = (process.env.ADMIN_SEED_EMAIL || "").toLowerCase().trim();
  const password = process.env.ADMIN_SEED_PASSWORD || "";
  if (!email || !password) {
    console.error("Set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD in .env.local first.");
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("ADMIN_SEED_PASSWORD must be at least 10 characters.");
    process.exit(1);
  }

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "spiderman_bnd",
    timezone: "Z",
  });

  const [[role]] = await db.query(
    "SELECT id FROM admin_roles WHERE slug = 'super_admin'"
  );
  if (!role) {
    console.error("admin_roles not seeded — run `npm run db:migrate` first.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, Number(process.env.BCRYPT_COST || 12));
  await db.query(
    `INSERT INTO admin_users (name, email, password_hash, role_id, status)
     VALUES (?, ?, ?, ?, 'active')
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       password_hash = VALUES(password_hash),
       role_id = VALUES(role_id),
       status = 'active',
       token_version = token_version + 1`,
    [name, email, hash, role.id]
  );

  console.log(`Super admin ready: ${email}`);
  await db.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
