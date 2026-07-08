"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "@/lib/admin/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

const TABS = ["open", "dismissed", "actioned", "all"];

// Mirror of lib/server/moderation.js so moderators see the consequence a
// takedown will trigger *before* they confirm it.
function nextConsequence(currentStrikes) {
  const strike = (currentStrikes || 0) + 1;
  if (strike >= 4) return { strike, label: "a full account suspension (can no longer use the platform)" };
  const map = { 1: "a 24-hour", 2: "a 48-hour", 3: "a one-week" };
  return { strike, label: `${map[strike]} ban from posting on the Forum & MJ Wall` };
}

function contentStatusVariant(status) {
  if (status === "active") return "secondary";
  if (status === "hidden") return "destructive";
  return "outline";
}

export default function AdminReportsPage() {
  const [status, setStatus] = useState("open");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [takedown, setTakedown] = useState(null); // report being actioned
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ page: String(page) });
      if (status !== "all") qs.set("status", status);
      setData(await adminApi(`/reports?${qs.toString()}`));
    } catch (e) {
      toast.error(e.message);
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id, action, extra = {}) {
    setBusy(true);
    try {
      const res = await adminApi(`/reports/${id}`, { method: "PATCH", body: { action, ...extra } });
      if (action === "dismiss") toast.success("Report dismissed — content kept");
      else
        toast.success(
          res.strike
            ? `Content taken down — strike ${res.strike} applied to the author`
            : "Content taken down"
        );
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Content the community flagged. <b>Dismiss</b> keeps it up; <b>Take down</b> hides it and
          strikes the author — 1st strike a 24h posting ban, 2nd 48h, 3rd a week, 4th a full account
          suspension.
        </p>
      </div>

      <Tabs
        value={status}
        onValueChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
      >
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {!data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[42%]">Reported content</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-normal align-top">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {r.entityType}
                      </Badge>
                      <Badge variant={contentStatusVariant(r.content.status)} className="capitalize">
                        {r.content.status || "gone"}
                      </Badge>
                      {r.entityOpenReports > 1 && r.status === "open" && (
                        <Badge variant="destructive">{r.entityOpenReports} reports</Badge>
                      )}
                    </div>
                    {r.content.title && (
                      <p className="text-sm font-semibold">
                        {r.entityType === "comment" ? "on: " : ""}
                        {r.content.title}
                      </p>
                    )}
                    <p className="line-clamp-2 text-xs text-muted-foreground">{r.content.preview}</p>
                    <p className="mt-1 text-sm">
                      <span className="text-muted-foreground">Reason: </span>
                      {r.reason}
                    </p>
                    {r.status !== "open" && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.status === "actioned" ? "Taken down" : "Dismissed"}
                        {r.resolvedBy ? ` by ${r.resolvedBy}` : ""}
                        {r.resolvedAt ? ` · ${new Date(r.resolvedAt).toLocaleString()}` : ""}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="font-medium">u/{r.content.author || "—"}</div>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {r.content.authorStrikes > 0 && (
                        <Badge variant="outline">{r.content.authorStrikes} strikes</Badge>
                      )}
                      {r.content.authorAccount === "disabled" && (
                        <Badge variant="destructive">suspended</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">u/{r.reporter}</TableCell>
                  <TableCell className="align-top text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="space-x-2 text-right align-top">
                    {r.status === "open" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => act(r.id, "dismiss")}
                        >
                          Dismiss
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy || r.content.status !== "active"}
                          onClick={() => {
                            setTakedown(r);
                            setReason("");
                          }}
                        >
                          Take down
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground capitalize">{r.status}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No {status === "all" ? "" : status} reports.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {data.total} report{data.total === 1 ? "" : "s"}
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

      <Dialog open={!!takedown} onOpenChange={(open) => !open && setTakedown(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take down this {takedown?.entityType}</DialogTitle>
            <DialogDescription>
              The {takedown?.entityType} is hidden from the community and the author is notified.
              This counts as a strike against them.
            </DialogDescription>
          </DialogHeader>
          {takedown && (
            <div className="space-y-3">
              <p className="rounded-md bg-muted p-3 text-sm">
                {takedown.content.preview || takedown.content.title}
              </p>
              {(() => {
                const c = nextConsequence(takedown.content.authorStrikes);
                return (
                  <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                    u/{takedown.content.author} has{" "}
                    <b>{takedown.content.authorStrikes} prior strike
                    {takedown.content.authorStrikes === 1 ? "" : "s"}</b>. This will be strike{" "}
                    <b>{c.strike}</b> → <b>{c.label}</b>.
                  </p>
                );
              })()}
              {takedown.entityOpenReports > 1 && (
                <p className="text-xs text-muted-foreground">
                  Resolves all {takedown.entityOpenReports} open reports on this {takedown.entityType}.
                </p>
              )}
              <Textarea
                placeholder="Reason shown to the author (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={255}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTakedown(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                await act(takedown.id, "takedown", { reason: reason || undefined });
                setTakedown(null);
              }}
            >
              Take down &amp; strike
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
