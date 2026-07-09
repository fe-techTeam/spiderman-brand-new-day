// Migration runner: applies migrations/*.sql in filename order, once each,
// tracked in schema_migrations. Creates the database if missing, so a fresh
// machine needs only MySQL running + .env.local filled in.
//
//   npm run db:migrate

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd()); // same .env.local the Next runtime reads

// The npm `prebuild` hook runs this before every `next build` so bare-metal
// (PM2) deploys migrate automatically. The Docker builder stage has no DB and
// sets SKIP_DB_MIGRATE=1 to opt out — there, migrations run at container boot
// instead (scripts/docker-entrypoint.sh).
if (process.env.SKIP_DB_MIGRATE === "1") {
  console.log("SKIP_DB_MIGRATE=1 — skipping migrations.");
  process.exit(0);
}

const DB_NAME = process.env.DB_NAME || "spiderman_bnd";

async function main() {
  const server = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });
  // A least-privilege DB user may not hold the CREATE (database) grant. That's
  // fine as long as the schema already exists — we prove that by connecting to
  // it right below; only a genuinely missing database fails there. So don't let
  // an "access denied" here abort a deploy against an already-provisioned DB.
  try {
    await server.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`
    );
  } catch (err) {
    console.warn(
      `CREATE DATABASE skipped (${err.code || err.message}); assuming \`${DB_NAME}\` already exists.`
    );
  } finally {
    await server.end();
  }

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: DB_NAME,
    multipleStatements: true,
    timezone: "Z",
  });

  // Serialize concurrent runners (e.g. several ECS tasks booting at once) with a
  // MySQL advisory lock. Only one applies migrations; the others block here, then
  // find schema_migrations already up to date and do nothing. The lock is bound
  // to this connection, so it releases even if the process is killed mid-run.
  const LOCK = `bnd_migrate:${DB_NAME}`;
  const [lockRows] = await db.query("SELECT GET_LOCK(?, 180) AS ok", [LOCK]);
  if (lockRows[0]?.ok !== 1) {
    await db.end();
    throw new Error(
      "Timed out waiting for the migration lock (another instance is still migrating)."
    );
  }

  try {
    await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB`);

    const dir = path.join(__dirname, "..", "migrations");
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    const [appliedRows] = await db.query("SELECT filename FROM schema_migrations");
    const applied = new Set(appliedRows.map((r) => r.filename));

    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      process.stdout.write(`applying ${file} ... `);
      try {
        await db.query(sql);
        await db.query("INSERT INTO schema_migrations (filename) VALUES (?)", [file]);
        console.log("ok");
        ran++;
      } catch (err) {
        console.log("FAILED");
        console.error(`\nMigration ${file} failed: ${err.message}`);
        console.error("Nothing after it was applied. Fix the file and re-run.");
        // Non-zero exit without process.exit() so the finally below still runs
        // (releases the lock) and the entrypoint aborts boot — deploy fails safe.
        process.exitCode = 1;
        return;
      }
    }

    console.log(ran === 0 ? "Already up to date." : `Applied ${ran} migration(s).`);
  } finally {
    await db.query("SELECT RELEASE_LOCK(?)", [LOCK]).catch(() => {});
    await db.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
