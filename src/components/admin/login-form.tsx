"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE_PRODUCT_NAME, getSeedAdminEmail, getSeedAdminPassword } from "@/config/site";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="font-heading text-2xl text-primary">{SITE_PRODUCT_NAME}</CardTitle>
        <p className="text-sm text-muted-foreground">Admin Login</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required defaultValue={getSeedAdminEmail()} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required defaultValue={getSeedAdminPassword()} />
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
