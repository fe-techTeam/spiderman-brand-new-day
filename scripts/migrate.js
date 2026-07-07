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

const DB_NAME = process.env.DB_NAME || "spiderman_bnd";

async function main() {
  const server = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });
  await server.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`
  );
  await server.end();

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: DB_NAME,
    multipleStatements: true,
    timezone: "Z",
  });

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
      await db.end();
      process.exit(1);
    }
  }

  console.log(ran === 0 ? "Already up to date." : `Applied ${ran} migration(s).`);
  await db.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
