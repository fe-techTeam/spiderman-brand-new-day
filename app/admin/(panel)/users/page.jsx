"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "@/lib/admin/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUSES = ["all", "active", "disabled"];

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}

export default function AdminUsersPage() {
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState(""); // input value
  const [q, setQ] = useState(""); // applied search
  const [data, setData] = useState(null);
  const [viewing, setViewing] = useState(null); // user whose detail dialog is open
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (q) params.set("q", q);
      if (status !== "all") params.set("status", status);
      setData(await adminApi(`/users?${params}`));
    } catch (e) {
      toast.error(e.message);
    }
  }, [q, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id, action) {
    try {
      await adminApi(`/users/${id}`, { method: "PATCH", body: { action } });
      toast.success(`User ${action}d`);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function openView(u) {
    setViewing(u);
    setDetail(null);
    try {
      setDetail(await adminApi(`/users/${u.id}`));
    } catch (e) {
      toast.error(e.message);
      setViewing(null);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">
          Search, inspect and disable fan accounts.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(query.trim());
            setPage(1);
          }}
        >
          <Input
            placeholder="Search username, email or mobile"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-64"
          />
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        <Tabs
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <TabsList>
            {STATUSES.map((s) => (
              <TabsTrigger key={s} value={s} className="capitalize">
                {s}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {!data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Identity</TableHead>
                <TableHead>Spidey Code</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <p className="text-sm font-bold">u/{u.username}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </TableCell>
                  <TableCell>
                    {u.quiz_completed_at ? (
                      <span className="text-sm">
                        {u.avatar_emoji} {u.avatar_name}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Quiz pending</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{u.spidey_code || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {[u.state, u.country].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.status === "disabled" ? "destructive" : "secondary"}>
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => openView(u)}>
                      View
                    </Button>
                    {u.status === "active" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            Disable
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Disable u/{u.username}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              They are logged out immediately and can no longer sign in.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => act(u.id, "disable")}>
                              Disable
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {u.status === "disabled" && (
                      <Button size="sm" variant="outline" onClick={() => act(u.id, "enable")}>
                        Enable
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {data.total} user{data.total === 1 ? "" : "s"}
            </span>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span>
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>u/{viewing?.username}</DialogTitle>
            <DialogDescription>Full profile, activity and quiz result.</DialogDescription>
          </DialogHeader>
          {!detail ? (
            <Skeleton className="h-48" />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <Field label="Email" value={detail.user.email} />
                <Field label="Mobile" value={detail.user.mobile} />
                <Field label="Spidey Code" value={detail.user.spidey_code} />
                <Field
                  label="Location"
                  value={[detail.user.state, detail.user.country].filter(Boolean).join(", ")}
                />
                <Field label="Joined" value={new Date(detail.user.created_at).toLocaleString()} />
                <Field
                  label="Last login"
                  value={
                    detail.user.last_login_at
                      ? new Date(detail.user.last_login_at).toLocaleString()
                      : null
                  }
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  ["Posts", detail.activity.posts],
                  ["Comments", detail.activity.comments],
                  ["MJ messages", detail.activity.mjMessages],
                  ["Fan art", detail.activity.fanArt],
                ].map(([label, count]) => (
                  <div key={label} className="rounded-md bg-muted p-3 text-center">
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              {detail.quiz && (
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Assigned avatar</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm font-bold">
                      {detail.user.avatar_emoji} {detail.quiz.avatar_name}
                    </span>
                    {!!detail.quiz.tie_broken && <Badge variant="outline">Tie broken</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Completed {new Date(detail.quiz.updated_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
