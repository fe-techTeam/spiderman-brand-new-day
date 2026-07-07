"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "@/lib/admin/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// fan_art is deliberately absent — the feature is parked and hidden admin-wide
const ENTITIES = [
  "user",
  "post",
  "comment",
  "mj_message",
  "quiz_question",
  "quiz_option",
  "avatar",
  "admin_user",
];

// meta arrives from mysql2 either already-parsed (object) or as a JSON string.
function parseMeta(meta) {
  if (meta == null) return null;
  if (typeof meta === "string") {
    try {
      return JSON.parse(meta);
    } catch {
      return meta;
    }
  }
  return meta;
}

export default function AdminAuditPage() {
  const [entity, setEntity] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [viewing, setViewing] = useState(null); // entry whose meta is shown

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (entity !== "all") params.set("entity", entity);
      setData(await adminApi(`/audit?${params}`));
    } catch (e) {
      toast.error(e.message);
    }
  }, [entity, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          Every admin action is recorded here. Entries can&apos;t be edited or deleted.
        </p>
      </div>

      <Select
        value={entity}
        onValueChange={(v) => {
          setEntity(v);
          setPage(1);
        }}
      >
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Filter by entity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All entities</SelectItem>
          {ENTITIES.map((e) => (
            <SelectItem key={e} value={e}>
              {e}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((entry) => {
                const meta = parseMeta(entry.meta);
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{entry.admin_name}</p>
                      <p className="text-xs text-muted-foreground">{entry.admin_email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.entity_id != null
                        ? `${entry.entity_type} #${entry.entity_id}`
                        : entry.entity_type}
                    </TableCell>
                    <TableCell className="text-right">
                      {meta != null && (
                        <Button size="sm" variant="ghost" onClick={() => setViewing(entry)}>
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No audit entries{entity === "all" ? "" : ` for ${entity}`} yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {data.total} entr{data.total === 1 ? "y" : "ies"}
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
            <DialogTitle>Audit details</DialogTitle>
            <DialogDescription>
              {viewing &&
                `${viewing.action} by ${viewing.admin_name} on ${new Date(
                  viewing.created_at
                ).toLocaleString()}`}
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs">
              {JSON.stringify(parseMeta(viewing.meta), null, 2)}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
