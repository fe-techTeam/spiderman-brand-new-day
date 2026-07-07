// MySQL connection pool — the single DB entry point for all server code.
// Server-only: never import from a client component. See BACKEND.md §13.5.

import mysql from "mysql2/promise";

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "spiderman_bnd",
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    waitForConnections: true,
    namedPlaceholders: false,
    timezone: "Z", // store/read UTC; clients render relative times
    dateStrings: false,
    supportBigNumbers: true,
    charset: "utf8mb4_0900_ai_ci",
  });
}

// Cache on globalThis so Next dev hot-reload doesn't leak pools.
const globalForDb = globalThis;
export function getPool() {
  if (!globalForDb.__bndPool) globalForDb.__bndPool = createPool();
  return globalForDb.__bndPool;
}

/** Run a prepared statement; returns rows (SELECT) or the result header (mutations). */
export async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

/** Run `fn(conn)` inside a transaction; rolls back on throw. */
export async function withTransaction(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}
