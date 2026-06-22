"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  locale: string;
};

export function AccountForgotPasswordForm({ locale }: Props) {
  const t = useTranslations("account");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, locale }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(t("forgotPasswordError"));
      return;
    }
    const data = (await res.json()) as { message?: string };
    setMessage(data.message ?? t("forgotPasswordSuccess"));
    setEmail("");
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("forgotPasswordTitle")}</CardTitle>
        <CardDescription>{t("forgotPasswordDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("sending") : t("sendResetLink")}
          </Button>
        </form>
        <p className="text-muted-foreground mt-4 text-center text-sm">
          <Link href={`/${locale}/account/login`} className="text-primary underline">
            {t("backToSignIn")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
