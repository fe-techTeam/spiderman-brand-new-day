"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Toaster } from "sonner";
import {
  LayoutDashboard,
  MessageSquareHeart,
  Users,
  MessagesSquare,
  Flag,
  ListChecks,
  Sparkles,
  ShieldCheck,
  ScrollText,
  Share2,
  Radio,
  Clapperboard,
  LogOut,
  Menu,
  X,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Sidebar is segmented into sections (client request). Fan Art is deliberately
// unlisted — the review flow is parked.
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard.view" }],
  },
  {
    label: "Moderation",
    items: [
      { href: "/admin/mj-wall", label: "MJ Wall", icon: MessageSquareHeart, perm: "mj.review" },
      { href: "/admin/webshots", label: "Webshots", icon: Radio, perm: "livefeed.manage" },
      { href: "/admin/forum", label: "Forum", icon: MessagesSquare, perm: "forum.moderate" },
      { href: "/admin/reports", label: "Reports", icon: Flag, perm: "forum.moderate" },
    ],
  },
  {
    label: "Users & Logs",
    items: [
      { href: "/admin/users", label: "Users", icon: Users, perm: "users.view" },
      { href: "/admin/shares", label: "Shares", icon: Share2, perm: "shares.view" },
      { href: "/admin/audit", label: "Audit Log", icon: ScrollText, perm: "audit.view" },
    ],
  },
  {
    label: "Masters",
    items: [
      { href: "/admin/quiz", label: "Quiz & Mapping", icon: ListChecks, perm: "quiz.manage" },
      { href: "/admin/avatars", label: "Avatars", icon: Sparkles, perm: "avatars.manage" },
      { href: "/admin/media", label: "Media", icon: Clapperboard, perm: "media.manage" },
      { href: "/admin/admins", label: "Admins", icon: ShieldCheck, perm: "admins.manage" },
    ],
  },
];

export default function AdminShell({ admin, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const perms = new Set(admin.permissions);
  const [open, setOpen] = useState(false); // mobile drawer

  // navigating closes the drawer
  useEffect(() => { setOpen(false); }, [pathname]);

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => perms.has(item.perm)),
  })).filter((g) => g.items.length);

  return (
    <div className="flex min-h-screen">
      {/* mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 py-3 md:hidden">
        <Button variant="ghost" size="icon" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.3em] text-primary">Brand New Day</div>
          <div className="text-sm font-bold leading-tight">Admin Console</div>
        </div>
      </header>

      {/* drawer scrim (mobile) */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-5 py-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
            Brand New Day
          </div>
          <div className="text-lg font-bold text-sidebar-foreground">Admin Console</div>
        </div>
        <Separator className="bg-sidebar-border" />
        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
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
              </div>
            </div>
          ))}
        </nav>
        <Separator className="bg-sidebar-border" />
        <div className="p-4">
          {/* jump back to the public site (new tab — keeps the console open) */}
          <Button asChild size="sm" className="mb-3 w-full">
            <a href="/" target="_blank" rel="noopener noreferrer">
              <Globe className="size-4" /> View main website
            </a>
          </Button>
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

      <main className="min-w-0 flex-1 p-4 pt-20 md:ml-60 md:p-8 md:pt-8">{children}</main>
      <Toaster richColors position="top-right" theme="dark" />
    </div>
  );
}
