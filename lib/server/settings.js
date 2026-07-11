// Tiny key-value settings store (settings table, migration 012). First use:
// the admin-editable share message template. Server-only.

import { query } from "@/lib/server/db";

export async function getSetting(name) {
  const rows = await query("SELECT value FROM settings WHERE name = ?", [name]);
  return rows.length ? rows[0].value : null;
}

export async function setSetting(name, value) {
  await query(
    "INSERT INTO settings (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?",
    [name, value, value]
  );
}
