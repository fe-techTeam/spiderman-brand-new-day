// Bootstrap super admin from ADMIN_SEED_* env vars — idempotent.
//
// Safe to run on every container boot (the Docker entrypoint does): if an admin
// with that email already exists it is left EXACTLY as-is — the password is not
// re-applied (an admin may have rotated it in the panel) and token_version is
// not bumped (that would log out live admin sessions on every deploy). Only the
// first run, when no such admin exists, creates the row.
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

  // Not configured — nothing to seed, and that's not an error: user signup/login
  // work fine without a bootstrap admin. Set ADMIN_SEED_* and redeploy to create
  // it. Returning 0 keeps this from blocking container boot.
  if (!email || !password) {
    console.log("ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD not set — skipping admin seed.");
    return;
  }
  if (password.length < 10) {
    console.error("ADMIN_SEED_PASSWORD must be at least 10 characters — skipping admin seed.");
    process.exitCode = 1;
    return;
  }

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "spiderman_bnd",
    timezone: "Z",
  });

  try {
    const [[role]] = await db.query(
      "SELECT id FROM admin_roles WHERE slug = 'super_admin'"
    );
    if (!role) {
      console.error("admin_roles not seeded — run migrations first.");
      process.exitCode = 1;
      return;
    }

    // Already bootstrapped? Leave the row untouched — don't re-hash, don't reset
    // a rotated password, don't bump token_version (would log out live sessions).
    const [[existing]] = await db.query(
      "SELECT id FROM admin_users WHERE email = ?",
      [email]
    );
    if (existing) {
      console.log(`Super admin already present (${email}) — leaving unchanged.`);
      return;
    }

    const hash = await bcrypt.hash(password, Number(process.env.BCRYPT_COST || 12));
    // ON DUPLICATE KEY UPDATE id = id is a deliberate no-op: if two tasks race on
    // the very first boot, the loser resolves to "no change" instead of a
    // duplicate-key error. It never overwrites an existing admin.
    await db.query(
      `INSERT INTO admin_users (name, email, password_hash, role_id, status)
       VALUES (?, ?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE id = id`,
      [name, email, hash, role.id]
    );
    console.log(`Super admin created: ${email}`);
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
