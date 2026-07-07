import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/server/admin-auth";
import AdminShell from "@/components/admin/AdminShell";

// Server-side session check on every panel render — the proxy redirect is only
// the optimistic first line; this (and every /api/admin handler) is the real one.
export default async function AdminPanelLayout({ children }) {
  const admin = await verifyAdminSession();
  if (!admin) redirect("/admin/login");

  return (
    <AdminShell
      admin={{
        name: admin.name,
        email: admin.email,
        role: admin.role,
        roleName: admin.roleName,
        permissions: [...admin.permissions],
      }}
    >
      {children}
    </AdminShell>
  );
}
