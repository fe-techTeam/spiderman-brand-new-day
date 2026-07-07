"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Toaster } from "sonner";
import {
  LayoutDashboard,
  MessageSquareHeart,
  Palette,
  Users,
  MessagesSquare,
  ListChecks,
  Sparkles,
  ShieldCheck,
  ScrollText,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard.view" },
  { href: "/admin/mj-wall", label: "MJ Wall", icon: MessageSquareHeart, perm: "mj.review" },
  { href: "/admin/fan-art", label: "Fan Art", icon: Palette, perm: "fanart.review" },
  { href: "/admin/users", label: "Users", icon: Users, perm: "users.view" },
  { href: "/admin/forum", label: "Forum", icon: MessagesSquare, perm: "forum.moderate" },
  { href: "/admin/quiz", label: "Quiz & Mapping", icon: ListChecks, perm: "quiz.manage" },
  { href: "/admin/avatars", label: "Avatars", icon: Sparkles, perm: "avatars.manage" },
  { href: "/admin/admins", label: "Admins", icon: ShieldCheck, perm: "admins.manage" },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText, perm: "audit.view" },
];

export default function AdminShell({ admin, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const perms = new Set(admin.permissions);

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="px-5 py-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
            Brand New Day
          </div>
          <div className="text-lg font-bold text-sidebar-foreground">Admin Console</div>
        </div>
        <Separator className="bg-sidebar-border" />
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.filter((item) => perms.has(item.perm)).map((item) => {
            const active =
              item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Separator className="bg-sidebar-border" />
        <div className="p-4">
          <div className="mb-2 min-w-0">
            <div className="truncate text-sm font-medium text-sidebar-foreground">{admin.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {admin.roleName} · {admin.email}
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={logout}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="ml-60 flex-1 p-8">{children}</main>
      <Toaster richColors position="top-right" theme="dark" />
    </div>
  );
}
