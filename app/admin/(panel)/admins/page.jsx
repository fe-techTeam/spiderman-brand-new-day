"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "@/lib/admin/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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

const MIN_PASSWORD = 10;
const EMPTY_FORM = { name: "", email: "", password: "", roleId: "" };

export default function AdminAdminsPage() {
  const [data, setData] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [resetting, setResetting] = useState(null); // admin whose password is being reset
  const [newPassword, setNewPassword] = useState("");
  const [disabling, setDisabling] = useState(null); // admin being disabled

  const load = useCallback(async () => {
    try {
      setData(await adminApi("/admins"));
    } catch (e) {
      toast.error(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patchAdmin(id, body, message) {
    try {
      await adminApi(`/admins/${id}`, { method: "PATCH", body });
      toast.success(message);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function createAdmin() {
    try {
      await adminApi("/admins", {
        method: "POST",
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          roleId: Number(form.roleId),
        },
      });
      toast.success("Admin created");
      setCreating(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const formRole = data?.roles.find((r) => String(r.id) === form.roleId);
  const canCreate =
    form.name.trim() && form.email.trim() && form.password.length >= MIN_PASSWORD && form.roleId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admins</h1>
          <p className="text-sm text-muted-foreground">
            Admin accounts and their roles. Only super admins can manage this page.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(EMPTY_FORM);
            setCreating(true);
          }}
        >
          New admin
        </Button>
      </div>

      {!data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.admins.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <p className="text-sm font-semibold">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.email}</p>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={String(a.role_id)}
                      onValueChange={(v) =>
                        patchAdmin(
                          a.id,
                          { roleId: Number(v) },
                          "Role updated — their session refreshes on next request"
                        )
                      }
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {data.roles.map((r) => (
                          <SelectItem key={r.id} value={String(r.id)}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={a.status === "disabled" ? "destructive" : "outline"}
                      className="capitalize"
                    >
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {a.last_login_at ? new Date(a.last_login_at).toLocaleString() : "Never"}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setResetting(a);
                        setNewPassword("");
                      }}
                    >
                      Reset password
                    </Button>
                    {a.status === "disabled" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => patchAdmin(a.id, { action: "enable" }, "Admin enabled")}
                      >
                        Enable
                      </Button>
                    ) : (
                      <Button size="sm" variant="destructive" onClick={() => setDisabling(a)}>
                        Disable
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {data.admins.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No admin accounts yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {data.admins.length} admin account{data.admins.length === 1 ? "" : "s"}
            </span>
          </div>
        </>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New admin</DialogTitle>
            <DialogDescription>
              They can log in immediately with the password you set here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-admin-name">Name</Label>
              <Input
                id="new-admin-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-admin-email">Email</Label>
              <Input
                id="new-admin-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-admin-password">Password</Label>
              <PasswordInput
                id="new-admin-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Min 10 characters.</p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.roleId}
                onValueChange={(v) => setForm((f) => ({ ...f, roleId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {data?.roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formRole?.description && (
                <p className="text-xs text-muted-foreground">{formRole.description}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button disabled={!canCreate} onClick={createAdmin}>
              Create admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetting} onOpenChange={(open) => !open && setResetting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetting?.name}. It takes effect immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-password">New password</Label>
            <PasswordInput
              id="reset-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Min 10 characters.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetting(null)}>
              Cancel
            </Button>
            <Button
              disabled={newPassword.length < MIN_PASSWORD}
              onClick={async () => {
                await patchAdmin(resetting.id, { password: newPassword }, "Password reset");
                setResetting(null);
              }}
            >
              Reset password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!disabling} onOpenChange={(open) => !open && setDisabling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable {disabling?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They are signed out on their next request and can&apos;t log in again until
              re-enabled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await patchAdmin(disabling.id, { action: "disable" }, "Admin disabled");
                setDisabling(null);
              }}
            >
              Disable admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
