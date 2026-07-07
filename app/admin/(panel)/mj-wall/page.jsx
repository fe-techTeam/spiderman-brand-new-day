"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "@/lib/admin/api";
import { downloadXlsx, fetchAllPages, fmtDate } from "@/lib/admin/export";
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

const STATUSES = ["pending", "approved", "rejected", "hidden"];

export default function AdminMjWallPage() {
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [rejecting, setRejecting] = useState(null); // message being rejected
  const [reason, setReason] = useState("");
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await adminApi(`/mj-messages?status=${status}&page=${page}`));
    } catch (e) {
      toast.error(e.message);
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id, action, extra = {}) {
    try {
      await adminApi(`/mj-messages/${id}`, { method: "PATCH", body: { action, ...extra } });
      toast.success(`Message ${action}d`);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function exportExcel() {
    if (exporting) return;
    setExporting(true);
    try {
      const rows = await fetchAllPages((p) =>
        adminApi(`/mj-messages?status=${status}&page=${p}&limit=50`)
      );
      downloadXlsx(
        `mj-wall-${status}-${new Date().toISOString().slice(0, 10)}.xlsx`,
        "MJ Wall",
        rows.map((m) => ({
          ID: m.id,
          Message: m.body,
          Author: "u/" + m.username,
          Status: m.status,
          "Rejection Reason": m.rejection_reason || "",
          Submitted: fmtDate(m.created_at),
          Reviewed: fmtDate(m.reviewed_at),
          "Reviewed By": m.reviewed_by_name || "",
        }))
      );
      toast.success(`Exported ${rows.length} message${rows.length === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setExporting(false);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">MJ Wall</h1>
        <p className="text-sm text-muted-foreground">
          Messages to MJ require approval before they appear on the wall.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
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

        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          disabled={exporting}
          onClick={exportExcel}
        >
          {exporting ? "Exporting…" : "Export Excel"}
        </Button>
      </div>

      {!data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[45%]">Message</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-normal">
                    <p className="text-sm">{m.body}</p>
                    {m.status === "rejected" && m.rejection_reason && (
                      <p className="mt-1 text-xs text-destructive">Reason: {m.rejection_reason}</p>
                    )}
                  </TableCell>
                  <TableCell>u/{m.username}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    {m.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => act(m.id, "approve")}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setRejecting(m);
                            setReason("");
                          }}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {m.status === "approved" && (
                      <Button size="sm" variant="destructive" onClick={() => act(m.id, "hide")}>
                        Hide
                      </Button>
                    )}
                    {m.status === "hidden" && (
                      <Button size="sm" variant="outline" onClick={() => act(m.id, "unhide")}>
                        Restore
                      </Button>
                    )}
                    {m.status === "rejected" && (
                      <Button size="sm" variant="outline" onClick={() => act(m.id, "approve")}>
                        Approve anyway
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    Nothing {status} right now.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {data.total} message{data.total === 1 ? "" : "s"}
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

      <Dialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject message</DialogTitle>
            <DialogDescription>
              The author is notified that their message wasn't approved. An optional reason is
              shown to them.
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-md bg-muted p-3 text-sm">{rejecting?.body}</p>
          <Textarea
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={255}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await act(rejecting.id, "reject", { reason: reason || undefined });
                setRejecting(null);
              }}
            >
              Reject message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
