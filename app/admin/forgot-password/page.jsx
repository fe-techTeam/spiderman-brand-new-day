"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [devResetUrl, setDevResetUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      setMessage(data.message || "If that email belongs to an admin, a reset link is on its way.");
      if (data.resetUrl) setDevResetUrl(data.resetUrl); // dev-mode echo only
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Brand New Day
          </div>
          <CardTitle className="text-2xl">Forgot password</CardTitle>
          <CardDescription>
            Enter your admin email and we&apos;ll send you a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message ? (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">{message}</p>
              {devResetUrl && (
                <a href={devResetUrl} className="break-all text-sm text-primary underline">
                  {devResetUrl}
                </a>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link href="/admin/login">
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>
      </Button>
    </div>
  );
}
