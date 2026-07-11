"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, MessageSquareHeart, Flag } from "lucide-react";
import { adminApi } from "@/lib/admin/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    adminApi("/dashboard").then(setData).catch((e) => toast.error(e.message));
  }, []);

  if (!data) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  const { counts, latestUsers, identitySpread } = data;
  const kpis = [
    { label: "Total users", value: counts.totalUsers, sub: `+${counts.newUsers7d} this week` },
    { label: "Identity shares", value: counts.totalShares, sub: `+${counts.newShares7d} this week` },
    { label: "Active posts", value: counts.activePosts, sub: `${counts.activeComments} comments` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">The state of the Web at a glance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2">
              <CardDescription>{k.label}</CardDescription>
              <CardTitle className="text-3xl">{k.value}</CardTitle>
            </CardHeader>
            {k.sub && <CardContent className="text-xs text-muted-foreground">{k.sub}</CardContent>}
          </Card>
        ))}

        {/* MJ Wall review queue — deliberately louder than the stat cards */}
        <Link href="/admin/mj-wall" className="block">
          <Card className="relative h-full overflow-hidden border-primary/50 bg-gradient-to-br from-primary/20 via-primary/5 to-card transition-colors hover:border-primary">
            <div className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-primary/20 blur-2xl" />
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 font-semibold uppercase tracking-[0.14em] text-primary">
                <MessageSquareHeart className="size-4" /> MJ Wall pending
              </CardDescription>
              <CardTitle className="text-3xl">{counts.pendingMj}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {counts.pendingMj > 0 ? (
                <>
                  Review the queue <ArrowRight className="size-3.5" />
                </>
              ) : (
                "Queue clear — nothing waiting"
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Reported content queue — louder when something needs attention */}
        <Link href="/admin/reports" className="block">
          <Card
            className={
              "relative h-full overflow-hidden transition-colors " +
              (counts.openReports > 0
                ? "border-destructive/50 bg-gradient-to-br from-destructive/20 via-destructive/5 to-card hover:border-destructive"
                : "hover:border-primary/50")
            }
          >
            {counts.openReports > 0 && (
              <div className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-destructive/20 blur-2xl" />
            )}
            <CardHeader className="pb-2">
              <CardDescription
                className={
                  "flex items-center gap-2 font-semibold uppercase tracking-[0.14em] " +
                  (counts.openReports > 0 ? "text-destructive" : "")
                }
              >
                <Flag className="size-4" /> Reports open
              </CardDescription>
              <CardTitle className="text-3xl">{counts.openReports}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {counts.openReports > 0 ? (
                <>
                  Review reported content <ArrowRight className="size-3.5" />
                </>
              ) : (
                "Nothing reported — all clear"
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Latest signups</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Identity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">u/{u.username}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>
                      {u.avatar_name ? `${u.avatar_emoji} ${u.avatar_name}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === "active" ? "secondary" : "destructive"}>
                        {u.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {latestUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No users yet — the Web awaits.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Identity spread</CardTitle>
            <CardDescription>Users per Spider World avatar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {identitySpread.map((a) => {
              const max = Math.max(1, ...identitySpread.map((x) => x.users));
              return (
                <div key={a.name} className="flex items-center gap-3">
                  <div className="w-40 truncate text-sm">
                    {a.emoji} {a.name}
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(a.users / max) * 100}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-sm text-muted-foreground">{a.users}</div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
