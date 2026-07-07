import { verifyAdminSession } from "@/lib/server/admin-auth";

export async function GET() {
  const admin = await verifyAdminSession();
  if (!admin) return Response.json({ error: "Not authenticated" }, { status: 401 });
  return Response.json({
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      roleName: admin.roleName,
      permissions: [...admin.permissions],
    },
  });
}
