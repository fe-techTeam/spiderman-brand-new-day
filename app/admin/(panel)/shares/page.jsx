"use client";

// Shares — the "Share your identity" controls: the outbound message template
// (variables {AvatarIdentity} and {Link}) and the click log (one row per
// Share tap, repeats included by design).

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "@/lib/admin/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// mirrors the portal's substitution (lib/share-identity.js) for the preview
const SAMPLE = {
  identity: "THE PROTECTOR 🛡️",
  link: "https://spidermania.in/s/protector",
};

export default function SharesPage() {
  const [template, setTemplate] = useState(null); // null = loading
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  useEffect(() => {
    adminApi("/shares/template")
      .then((d) => setTemplate(d.template || ""))
      .catch((e) => toast.error(e.message));
  }, []);

  const load = useCallback(async () => {
    try {
      setData(await adminApi(`/shares?page=${page}`));
    } catch (e) {
      toast.error(e.message);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setSaving(true);
    try {
      await adminApi("/shares/template", { method: "PUT", body: { template } });
      toast.success("Share message updated");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const preview = (template || "")
    .replaceAll("{AvatarIdentity}", SAMPLE.identity)
    .replaceAll("{Link}", SAMPLE.link);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shares</h1>
        <p className="text-sm text-muted-foreground">
          The message members send when they share their identity, and every click of the Share button.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Share message</CardTitle>
          <CardDescription>
            <code className="text-xs">{"{AvatarIdentity}"}</code> becomes the member&apos;s identity (e.g. {SAMPLE.identity});{" "}
            <code className="text-xs">{"{Link}"}</code> becomes their personal share link. {"{Link}"} is required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {template === null ? (
            <Skeleton className="h-24" />
          ) : (
            <>
              <Textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={4}
                placeholder="🕸️ I just unmasked my Spider identity — I'm {AvatarIdentity} … {Link}"
              />
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Preview</p>
                <p className="whitespace-pre-wrap text-sm">{preview || "—"}</p>
              </div>
              <Button onClick={save} disabled={saving || !template.trim()}>
                {saving ? "Saving…" : "Save message"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Share log</h2>
        {!data ? (
          <Skeleton className="h-64" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Who</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>u/{row.username}</TableCell>
                  </TableRow>
                ))}
                {data.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="py-10 text-center text-muted-foreground">
                      No shares yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {data.total} share{data.total === 1 ? "" : "s"}
              </span>
              <div className="space-x-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span>
                  {page} / {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
