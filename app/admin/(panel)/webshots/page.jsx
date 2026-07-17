"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { adminApi, adminUpload } from "@/lib/admin/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
// Client-side caps mirror the server's (MAX_IMAGE_UPLOAD_MB / MAX_VIDEO_UPLOAD_MB).
const IMAGE_MAX_MB = 5;
const VIDEO_MAX_MB = 50;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

function fmtSize(bytes) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function MediaThumb({ item, onClick }) {
  const src = "/api/admin/media/" + item.media_id;
  const cls = "h-16 w-16 rounded-md object-cover cursor-zoom-in bg-muted";
  return item.kind === "video" ? (
    <video src={src} preload="metadata" muted playsInline className={cls} onClick={onClick} />
  ) : (
    <img src={src} alt="Webshots media" loading="lazy" className={cls} onClick={onClick} />
  );
}

export default function AdminWebshotsPage() {
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [uploadsEnabled, setUploadsEnabled] = useState(null); // null = loading
  const [navVisible, setNavVisible] = useState(null); // null = loading
  const [uploading, setUploading] = useState(null); // { done, total }
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState(null);
  const fileInput = useRef(null);

  const load = useCallback(async () => {
    try {
      setData(await adminApi(`/live-feed?status=${status}&page=${page}`));
    } catch (e) {
      toast.error(e.message);
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    adminApi("/live-feed/settings")
      .then((d) => {
        setUploadsEnabled(d.enabled);
        setNavVisible(d.navVisible);
      })
      .catch((e) => toast.error(e.message));
  }, []);

  async function toggleUploads(next) {
    setUploadsEnabled(next); // optimistic — reverted on failure
    try {
      await adminApi("/live-feed/settings", { method: "PUT", body: { enabled: next } });
      toast.success(next ? "Member uploads are ON" : "Member uploads are OFF");
    } catch (e) {
      setUploadsEnabled(!next);
      toast.error(e.message);
    }
  }

  async function toggleNavVisible(next) {
    setNavVisible(next); // optimistic — reverted on failure
    try {
      await adminApi("/live-feed/settings", { method: "PUT", body: { navVisible: next } });
      toast.success(next ? "Webshots is visible on the website" : "Webshots is hidden from the website");
    } catch (e) {
      setNavVisible(!next);
      toast.error(e.message);
    }
  }

  async function act(id, action, extra = {}) {
    try {
      await adminApi(`/live-feed/${id}`, { method: "PATCH", body: { action, ...extra } });
      toast.success(`Item ${action}${action.endsWith("e") ? "d" : "ed"}`);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  // Batch upload, one file per request (keeps each request small and gives
  // per-file errors). Server re-validates type/size by magic bytes.
  async function onFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    const valid = files.filter((f) => {
      const capMb = f.type.startsWith("video/") ? VIDEO_MAX_MB : IMAGE_MAX_MB;
      if (f.size > capMb * 1024 * 1024) {
        toast.error(`${f.name} is over ${capMb} MB — skipped`);
        return false;
      }
      return true;
    });

    let ok = 0;
    for (let i = 0; i < valid.length; i++) {
      setUploading({ done: i, total: valid.length });
      const fd = new FormData();
      fd.append("file", valid[i]);
      try {
        await adminUpload("/live-feed", fd);
        ok++;
      } catch (err) {
        toast.error(`${valid[i].name}: ${err.message}`);
      }
    }
    setUploading(null);
    if (ok) {
      toast.success(`${ok} file${ok === 1 ? "" : "s"} posted to the feed as Spidy Admin`);
      if (status === "approved" && page === 1) load();
      else {
        setStatus("approved");
        setPage(1);
      }
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Webshots</h1>
        <p className="text-sm text-muted-foreground">
          The members-only media wall at /webshots. Admin uploads go live instantly as Spidy
          Admin; member submissions wait here for review.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Show on website</CardTitle>
            <CardDescription>
              {navVisible
                ? "ON — the Webshots link shows in the site navbar."
                : "OFF — hidden from the navbar (the page URL still works)."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Switch
              checked={!!navVisible}
              disabled={navVisible === null}
              onCheckedChange={toggleNavVisible}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Member uploads</CardTitle>
            <CardDescription>
              {uploadsEnabled
                ? "ON — members can submit photos & videos into the review queue."
                : "OFF — only admins can post to the feed."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Switch
              checked={!!uploadsEnabled}
              disabled={uploadsEnabled === null}
              onCheckedChange={toggleUploads}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Post to the feed</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={onFiles}
            />
            <Button onClick={() => fileInput.current?.click()} disabled={!!uploading}>
              <Upload className="size-4" />
              {uploading ? `Uploading ${uploading.done + 1} of ${uploading.total}…` : "Upload media"}
            </Button>
          </CardContent>
        </Card>
      </div>

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

      {!data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Media</TableHead>
                <TableHead>Author</TableHead>
                <TableHead className="w-[30%]">Details</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <MediaThumb item={m} onClick={() => setPreview(m)} />
                  </TableCell>
                  <TableCell>
                    {m.username ? (
                      `u/${m.username}`
                    ) : (
                      <Badge variant="secondary">🕷 Spidy Admin{m.admin_name ? ` · ${m.admin_name}` : ""}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-normal text-xs text-muted-foreground">
                    <p className="capitalize">
                      {m.kind} · {fmtSize(m.size_bytes)}
                    </p>
                    {m.status === "rejected" && m.rejection_reason && (
                      <p className="mt-1 text-destructive">Reason: {m.rejection_reason}</p>
                    )}
                    {m.reviewed_by_name && (
                      <p className="mt-1">Reviewed by {m.reviewed_by_name}</p>
                    )}
                  </TableCell>
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
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nothing {status} right now.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {data.total} item{data.total === 1 ? "" : "s"}
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

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {preview?.username ? `u/${preview.username}` : "Spidy Admin"}
            </DialogTitle>
            <DialogDescription className="capitalize">
              {preview?.kind} · {preview ? fmtSize(preview.size_bytes) : ""}
            </DialogDescription>
          </DialogHeader>
          {preview &&
            (preview.kind === "video" ? (
              <video
                src={"/api/admin/media/" + preview.media_id}
                controls
                playsInline
                className="max-h-[70vh] w-full rounded-md bg-black"
              />
            ) : (
              <img
                src={"/api/admin/media/" + preview.media_id}
                alt="Webshots media"
                className="max-h-[70vh] w-full rounded-md object-contain"
              />
            ))}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject submission</DialogTitle>
            <DialogDescription>
              The member is notified that their {rejecting?.kind || "upload"} wasn&apos;t approved.
              An optional reason is shown to them.
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-md bg-muted p-3 text-sm">
            {rejecting?.kind === "video" ? "Video" : "Photo"} from u/{rejecting?.username}
          </p>
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
              Reject submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
