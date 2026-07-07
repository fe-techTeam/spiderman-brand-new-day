import { query } from "@/lib/server/db";

export async function GET() {
  const rows = await query("SELECT id, label FROM flairs WHERE is_active = 1 ORDER BY id");
  return Response.json({ flairs: rows });
}
