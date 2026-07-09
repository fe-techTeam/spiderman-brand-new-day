"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImageOff, Upload, X } from "lucide-react";
import { adminApi, adminUpload } from "@/lib/admin/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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

const EMPTY_FORM = {
  name: "",
  emoji: "",
  tagline: "",
  description: "",
  color: "#e11d48",
  cardImage: "",
  profileImage: "",
  sortOrder: 0,
};

export default function AdminAvatarsPage() {
  const [data, setData] = useState(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null); // avatar being edited
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setData(await adminApi("/avatars"));
    } catch (e) {
      toast.error(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setCreating(true);
  }

  function openEdit(avatar) {
    setForm({
      name: avatar.name,
      emoji: avatar.emoji || "",
      tagline: avatar.tagline || "",
      description: avatar.description || "",
      color: avatar.color || "#000000",
      cardImage: avatar.badge_asset || "",
      profileImage: avatar.profile_asset || "",
      sortOrder: avatar.sort_order ?? 0,
    });
    setEditing(avatar);
  }

  function closeDialog() {
    setCreating(false);
    setEditing(null);
  }

  async function save() {
    const body = {
      name: form.name,
      emoji: form.emoji,
      tagline: form.tagline,
      description: form.description,
      color: form.color,
      cardImage: form.cardImage.trim() || null,
      profileImage: form.profileImage.trim() || null,
      sortOrder: Number(form.sortOrder) || 0,
    };
    setSaving(true);
    try {
      if (editing) {
        await adminApi(`/avatars/${editing.id}`, { method: "PATCH", body });
        toast.success("Avatar updated");
      } else {
        await adminApi("/avatars", { method: "POST", body });
        toast.success("Avatar created");
      }
      closeDialog();
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  // one hidden file input serves both assets — uploadFieldRef says which form
  // field (cardImage / profileImage) the picked file belongs to
  const uploadFieldRef = useRef("cardImage");
  function pickFile(field) {
    uploadFieldRef.current = field;
    fileRef.current?.click();
  }
  async function onAssetFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // same file can be re-picked after an error
    if (!file) return;
    const field = uploadFieldRef.current;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { url } = await adminUpload("/avatars/card-asset", fd);
      setForm((f) => ({ ...f, [field]: url }));
      toast.success(`${field === "cardImage" ? "Card asset" : "Profile picture"} uploaded — save to apply`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function toggleActive(avatar, checked) {
    try {
      await adminApi(`/avatars/${avatar.id}`, {
        method: "PATCH",
        body: { isActive: checked },
      });
      toast.success(checked ? "Avatar activated" : "Avatar deactivated");
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
          <h1 className="text-2xl font-bold">Avatars</h1>
          <p className="text-sm text-muted-foreground">
            The 10 Spider World identities (plus any you add). Deactivating requires remapping
            quiz options first.
          </p>
        </div>
        <Button onClick={openCreate}>New avatar</Button>
      </div>

      {!data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[25%]">Identity</TableHead>
                <TableHead className="w-[22%]">Tagline</TableHead>
                <TableHead>Card</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Sort</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.avatars.map((a) => (
                <TableRow key={a.id} className={a.is_active ? undefined : "opacity-60"}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {a.profile_asset ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.profile_asset}
                          alt={`${a.name} profile`}
                          className="size-9 rounded-full border object-cover"
                        />
                      ) : (
                        <span className="text-2xl">{a.emoji}</span>
                      )}
                      <div>
                        <p className="font-bold">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.slug}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-0">
                    <p className="truncate text-sm text-muted-foreground">{a.tagline}</p>
                  </TableCell>
                  <TableCell>
                    {a.badge_asset ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.badge_asset}
                        alt={`${a.name} card`}
                        className="h-12 w-9 rounded-sm border object-cover"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-5 w-5 rounded border"
                        style={{ background: a.color }}
                      />
                      <span className="text-xs text-muted-foreground">{a.color}</span>
                    </div>
                  </TableCell>
                  <TableCell>{a.sort_order}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{a.user_count}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={!!a.is_active}
                      onCheckedChange={(checked) => toggleActive(a, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => openEdit(a)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {data.avatars.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No avatars yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {data.avatars.length} avatar{data.avatars.length === 1 ? "" : "s"}
            </span>
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "New avatar"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Changes appear everywhere the identity is shown."
                : "Adds a new identity to the quiz result pool."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="avatar-name">Name</Label>
                <Input
                  id="avatar-name"
                  value={form.name}
                  onChange={set("name")}
                  placeholder="Spider-Man"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar-emoji">Emoji</Label>
                <Input
                  id="avatar-emoji"
                  value={form.emoji}
                  onChange={set("emoji")}
                  className="w-20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar-tagline">Tagline</Label>
              <Input
                id="avatar-tagline"
                value={form.tagline}
                onChange={set("tagline")}
                placeholder="Your friendly neighborhood..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar-description">Description</Label>
              <Textarea
                id="avatar-description"
                value={form.description}
                onChange={set("description")}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Profile picture</Label>
              <div className="flex items-start gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
                  {form.profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.profileImage}
                      alt="Profile picture preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageOff className="size-5 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={uploading}
                      onClick={() => pickFile("profileImage")}
                    >
                      <Upload className="size-4" />
                      {uploading ? "Uploading…" : form.profileImage ? "Replace" : "Upload image"}
                    </Button>
                    {form.profileImage && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={uploading}
                        onClick={() => setForm((f) => ({ ...f, profileImage: "" }))}
                      >
                        <X className="size-4" /> Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Shown as the member&apos;s avatar on forum posts, comments and the MJ Wall for
                    everyone assigned this identity. Square works best. JPEG/PNG/WebP, max 5&nbsp;MB.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Final card asset</Label>
              <div className="flex items-start gap-4">
                <div className="flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                  {form.cardImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.cardImage}
                      alt="Card asset preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageOff className="size-5 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={uploading}
                      onClick={() => pickFile("cardImage")}
                    >
                      <Upload className="size-4" />
                      {uploading ? "Uploading…" : form.cardImage ? "Replace" : "Upload image"}
                    </Button>
                    {form.cardImage && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={uploading}
                        onClick={() => setForm((f) => ({ ...f, cardImage: "" }))}
                      >
                        <X className="size-4" /> Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The collectible card revealed on the quiz final screen. Leave empty for the
                    emblem fallback. JPEG/PNG/WebP, max 5&nbsp;MB.
                  </p>
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={onAssetFile}
              />
            </div>
            <div className="flex gap-4">
              <div className="space-y-2">
                <Label htmlFor="avatar-color">Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="avatar-color"
                    type="color"
                    value={form.color}
                    onChange={set("color")}
                    className="h-9 w-16 p-1"
                  />
                  <span className="text-xs text-muted-foreground">{form.color}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar-sort">Sort order</Label>
                <Input
                  id="avatar-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={set("sortOrder")}
                  className="w-24"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !form.name.trim()}>
              {editing ? "Save changes" : "Create avatar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
