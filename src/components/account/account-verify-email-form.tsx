"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { accountPublicPath } from "@/features/account/account-public-path";

type Props = {
  locale: string;
};

export function AccountVerifyEmailForm({ locale }: Props) {
  const t = useTranslations("account");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const emailParam = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error" | "otp">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("otp");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    void (async () => {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (cancelled) return;
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? t("verifyEmailFailed"));
        setStatus("error");
        return;
      }
      setStatus("ok");
    })();
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? t("verifyEmailFailed"));
      setStatus("otp");
      return;
    }
    setStatus("ok");
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("verifyEmailTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "loading" || status === "idle" ? (
          <p className="text-muted-foreground text-sm">{t("verifyEmailWorking")}</p>
        ) : null}
        {status === "otp" ? (
          <form onSubmit={submitOtp} className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Enter the 6-digit code from your email. Codes expire in 5 minutes.
            </p>
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                pattern="\d{6}"
              />
            </div>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={code.length !== 6}>
              Verify email
            </Button>
          </form>
        ) : null}
        {status === "ok" ? (
          <>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">{t("verifyEmailSuccess")}</p>
            <Button asChild className="w-full">
              <Link href={`${accountPublicPath(locale, "login")}?verified=1`}>{t("signIn")}</Link>
            </Button>
          </>
        ) : null}
        {status === "error" ? (
          <>
            <p className="text-destructive text-sm">{error}</p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setStatus("otp")}
            >
              Enter code instead
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href={accountPublicPath(locale, "login")}>{t("signIn")}</Link>
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
