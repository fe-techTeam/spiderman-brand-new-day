"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { adminApi } from "@/lib/admin/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

const EMPTY_FORM = { title: "", url: "", sortOrder: 0 };

const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;

export default function AdminMediaPage() {
  const [data, setData] = useState(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null); // video being edited
  const [deleting, setDeleting] = useState(null); // video pending delete confirm
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [sectionVisible, setSectionVisible] = useState(null); // null = loading

  const load = useCallback(async () => {
    try {
      setData(await adminApi("/media-videos"));
    } catch (e) {
      toast.error(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    adminApi("/media-videos/settings")
      .then((d) => setSectionVisible(d.sectionVisible))
      .catch((e) => toast.error(e.message));
  }, []);

  async function toggleSectionVisible(next) {
    setSectionVisible(next); // optimistic — reverted on failure
    try {
      await adminApi("/media-videos/settings", { method: "PUT", body: { sectionVisible: next } });
      toast.success(next ? "Media section is visible on the website" : "Media section is hidden from the website");
    } catch (e) {
      setSectionVisible(!next);
      toast.error(e.message);
    }
  }

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setCreating(true);
  }

  function openEdit(video) {
    setForm({
      title: video.title || "",
      url: watchUrl(video.youtube_id),
      sortOrder: video.sort_order ?? 0,
    });
    setEditing(video);
  }

  function closeDialog() {
    setCreating(false);
    setEditing(null);
  }

  async function save() {
    const body = {
      title: form.title,
      url: form.url,
      sortOrder: Number(form.sortOrder) || 0,
    };
    setSaving(true);
    try {
      if (editing) {
        await adminApi(`/media-videos/${editing.id}`, { method: "PATCH", body });
        toast.success("Video updated");
      } else {
        await adminApi("/media-videos", { method: "POST", body });
        toast.success("Video added");
      }
      closeDialog();
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(video, checked) {
    try {
      await adminApi(`/media-videos/${video.id}`, {
        method: "PATCH",
        body: { isActive: checked },
      });
      toast.success(checked ? "Video shown on the website" : "Video hidden from the website");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await adminApi(`/media-videos/${deleting.id}`, { method: "DELETE" });
      toast.success("Video removed");
      setDeleting(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const dialogOpen = creating || !!editing;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Media</h1>
          <p className="text-sm text-muted-foreground">
            YouTube videos in the landing page&apos;s Media carousel (above the footer). The
            section shows only while the switch below is ON and at least one video is visible.
          </p>
        </div>
        <Button onClick={openCreate}>New video</Button>
      </div>

      <Card className="max-w-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Show on website</CardTitle>
          <CardDescription>
            {sectionVisible
              ? "ON — the Media section shows on the landing page."
              : "OFF — the whole section is hidden, even with videos in the list."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Switch
            checked={!!sectionVisible}
            disabled={sectionVisible === null}
            onCheckedChange={toggleSectionVisible}
          />
        </CardContent>
      </Card>

      {!data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[45%]">Video</TableHead>
                <TableHead>Link</TableHead>
                <TableHead>Sort</TableHead>
                <TableHead>Added by</TableHead>
                <TableHead>Visible</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.videos.map((v) => (
                <TableRow key={v.id} className={v.is_active ? undefined : "opacity-60"}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://i.ytimg.com/vi/${v.youtube_id}/mqdefault.jpg`}
                        alt=""
                        className="h-12 w-[85px] shrink-0 rounded-sm border object-cover"
                      />
                      <div className="min-w-0">
                        {v.title ? (
                          <p className="truncate font-bold">{v.title}</p>
                        ) : (
                          <p className="italic text-muted-foreground">Untitled</p>
                        )}
                        <p className="text-xs text-muted-foreground">{v.youtube_id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <a
                      href={watchUrl(v.youtube_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      YouTube <ExternalLink className="size-3.5" />
                    </a>
                  </TableCell>
                  <TableCell>{v.sort_order}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{v.created_by_name || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={!!v.is_active}
                      onCheckedChange={(checked) => toggleActive(v, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(v)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleting(v)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {data.videos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No videos yet — add one and it appears on the landing page.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {data.videos.length} video{data.videos.length === 1 ? "" : "s"}
            </span>
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit video" : "New video"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Changes appear in the landing page carousel right away."
                : "Paste any YouTube link — watch, share (youtu.be) or Shorts."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="video-title">Title (optional)</Label>
              <Input
                id="video-title"
                value={form.title}
                onChange={set("title")}
                placeholder="Shown under the video — leave blank for none"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="video-url">YouTube link</Label>
              <Input
                id="video-url"
                value={form.url}
                onChange={set("url")}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <p className="text-xs text-muted-foreground">
                The video id is read from the link; thumbnail and playback come from YouTube.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="video-sort">Sort order</Label>
              <Input
                id="video-sort"
                type="number"
                value={form.sortOrder}
                onChange={set("sortOrder")}
                className="w-24"
              />
              <p className="text-xs text-muted-foreground">Lower numbers show first.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !form.url.trim()}>
              {editing ? "Save changes" : "Add video"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleting?.title ? `“${deleting.title}”` : "this video"}?</AlertDialogTitle>
            <AlertDialogDescription>
              It disappears from the landing page carousel immediately. The video itself stays
              on YouTube — you can re-add it any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Remove video</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
