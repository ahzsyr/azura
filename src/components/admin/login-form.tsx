"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE_PRODUCT_NAME, getSeedAdminEmail, getSeedAdminPassword } from "@/config/site";

type Props = {
  adminEmailHint?: string | null;
  dbReady?: boolean;
};

export function LoginForm({ adminEmailHint, dbReady = true }: Props) {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setupDone = searchParams.get("setup") === "done";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    if (result?.error || result?.ok === false) {
      setLoading(false);
      if (result?.code === "database_unavailable") {
        setError(
          "Cannot reach the database. Check DATABASE_URL in your deployment settings (Vercel or Hostinger), confirm Supabase is active, then redeploy.",
        );
        return;
      }
      setError("Invalid email or password. Use the password you set during setup.");
      return;
    }

    try {
      await fetch("/api/setup/reconcile", { cache: "no-store" });
    } catch {
      /* non-fatal — /admin is exempt from setup gate */
    }

    const raw = searchParams.get("callbackUrl")?.trim();
    const callbackUrl =
      raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/admin";
    window.location.href = callbackUrl;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="font-heading text-2xl text-primary">{SITE_PRODUCT_NAME}</CardTitle>
        <p className="text-sm text-muted-foreground">Admin Login</p>
      </CardHeader>
      <CardContent>
        {setupDone ? (
          <p className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
            Setup completed. Sign in with your new admin account.
          </p>
        ) : null}
        {!dbReady ? (
          <p className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
            Database is not reachable. Fix DATABASE_URL in your deployment settings and redeploy before signing in.
          </p>
        ) : dbReady ? (
          <p className="mb-4 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Sign in with the admin account you created during setup.
            <span className="mt-1 block text-xs">
              Use the password you chose in the setup wizard.
            </span>
          </p>
        ) : null}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={
                process.env.NODE_ENV === "production" ? undefined : getSeedAdminEmail()
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              defaultValue={
                process.env.NODE_ENV === "production" ? undefined : getSeedAdminPassword()
              }
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
