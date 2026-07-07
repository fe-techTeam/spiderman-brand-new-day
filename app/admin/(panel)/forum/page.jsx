"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "@/lib/admin/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const STATUS_FILTERS = ["all", "active", "hidden", "deleted"];

function statusVariant(status) {
  if (status === "active") return "secondary";
  if (status === "hidden") return "destructive";
  return "outline";
}

function buildQuery(q, status, page) {
  const params = new URLSearchParams({ page: String(page) });
  if (q) params.set("q", q);
  if (status !== "all") params.set("status", status);
  return params.toString();
}

export default function AdminForumPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Forum</h1>
        <p className="text-sm text-muted-foreground">
          Moderate community posts and comments. Author-deleted content is read-only.
        </p>
      </div>

      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="mt-4">
          <PostsTab />
        </TabsContent>
        <TabsContent value="comments" className="mt-4">
          <CommentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PostsTab() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [hiding, setHiding] = useState(null); // post being hidden
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await adminApi(`/posts?${buildQuery(q, status, page)}`));
    } catch (e) {
      toast.error(e.message);
    }
  }, [q, status, page]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function act(id, action, extra = {}) {
    try {
      await adminApi(`/posts/${id}`, { method: "PATCH", body: { action, ...extra } });
      toast.success(
        { hide: "Post hidden", unhide: "Post restored", spoiler: "Marked as spoiler", unspoiler: "Spoiler removed" }[
          action
        ] || "Post updated"
      );
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search posts…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s === "all" ? "All" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[35%]">Post</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Community</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-normal">
                    <p className="text-sm font-bold">{p.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{p.body_preview}</p>
                    {!!p.is_spoiler && (
                      <Badge className="mt-1" variant="outline">
                        Spoiler
                      </Badge>
                    )}
                    {p.status === "hidden" && p.moderation_reason && (
                      <p className="mt-1 text-xs text-destructive">Reason: {p.moderation_reason}</p>
                    )}
                  </TableCell>
                  <TableCell>u/{p.username}</TableCell>
                  <TableCell>{p.community || "—"}</TableCell>
                  <TableCell>{p.score}</TableCell>
                  <TableCell>{p.comment_count}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(p.status)} className="capitalize">
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    {p.status === "active" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => act(p.id, p.is_spoiler ? "unspoiler" : "spoiler")}
                        >
                          {p.is_spoiler ? "Unmark spoiler" : "Mark spoiler"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setHiding(p);
                            setReason("");
                          }}
                        >
                          Hide
                        </Button>
                      </>
                    )}
                    {p.status === "hidden" && (
                      <Button size="sm" variant="outline" onClick={() => act(p.id, "unhide")}>
                        Restore
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No posts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {data.total} post{data.total === 1 ? "" : "s"}
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

      <Dialog open={!!hiding} onOpenChange={(open) => !open && setHiding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hide post</DialogTitle>
            <DialogDescription>
              The post is removed from the forum but not deleted. An optional reason is shown to
              the author.
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-md bg-muted p-3 text-sm">{hiding?.title}</p>
          <Textarea
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={255}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setHiding(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await act(hiding.id, "hide", { reason: reason || undefined });
                setHiding(null);
              }}
            >
              Hide post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CommentsTab() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [hiding, setHiding] = useState(null); // comment being hidden
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await adminApi(`/comments?${buildQuery(q, status, page)}`));
    } catch (e) {
      toast.error(e.message);
    }
  }, [q, status, page]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function act(id, action, extra = {}) {
    try {
      await adminApi(`/comments/${id}`, { method: "PATCH", body: { action, ...extra } });
      toast.success(action === "hide" ? "Comment hidden" : "Comment restored");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search comments…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s === "all" ? "All" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[45%]">Comment</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-normal">
                    <p className="line-clamp-2 text-sm">{c.body_preview}</p>
                    <p className="text-xs text-muted-foreground">on: {c.post_title}</p>
                    {c.status === "hidden" && c.moderation_reason && (
                      <p className="mt-1 text-xs text-destructive">Reason: {c.moderation_reason}</p>
                    )}
                  </TableCell>
                  <TableCell>u/{c.username}</TableCell>
                  <TableCell>{c.score}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(c.status)} className="capitalize">
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    {c.status === "active" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setHiding(c);
                          setReason("");
                        }}
                      >
                        Hide
                      </Button>
                    )}
                    {c.status === "hidden" && (
                      <Button size="sm" variant="outline" onClick={() => act(c.id, "unhide")}>
                        Restore
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No comments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {data.total} comment{data.total === 1 ? "" : "s"}
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

      <Dialog open={!!hiding} onOpenChange={(open) => !open && setHiding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hide comment</DialogTitle>
            <DialogDescription>
              The comment is removed from the thread but not deleted. An optional reason is shown
              to the author.
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-md bg-muted p-3 text-sm">{hiding?.body_preview}</p>
          <Textarea
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={255}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setHiding(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await act(hiding.id, "hide", { reason: reason || undefined });
                setHiding(null);
              }}
            >
              Hide comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
