"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function ResetForm() {
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again.");
        return;
      }
      setMessage(data.message || "Password updated — sign in with your new password.");
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="mb-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
          Brand New Day
        </div>
        <CardTitle className="text-2xl">Reset password</CardTitle>
        <CardDescription>
          Choose a new admin password (10+ characters, at least one letter and one number).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {message ? (
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button asChild className="w-full">
              <Link href="/admin/login">Go to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password">New password</Label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <PasswordInput
                id="confirm"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link href="/admin/login">
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>
      </Button>
    </div>
  );
}
