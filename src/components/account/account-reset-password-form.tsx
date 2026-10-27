"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordField } from "@/components/account/password-field";
import { validateNewPassword } from "@/features/account/lib/password-form-validation";
import { CredentialChecks, useCredentialCheck } from "@/components/security/credential-checks";
import { accountPublicPath } from "@/features/account/account-public-path";
import { passwordResetVerifyDescription } from "@/features/account/password-reset-otp.helpers";
import { usePasswordResetFlow } from "@/components/account/use-password-reset-flow";

type Props = {
  locale: string;
};

/**
 * `/{locale}/account/reset-password`
 *
 * - With `?token=` this redeems a legacy emailed link (links sent before the
 *   switch to codes must keep working).
 * - Without a token it drives the code flow: request → verify → new password.
 */
export function AccountResetPasswordForm({ locale }: Props) {
  const t = useTranslations("account");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const credentialCheck = useCredentialCheck({ password, confirmPassword });
  const flow = usePasswordResetFlow({ locale });

  async function submitLegacyLink(e?: React.FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    const localError = validateNewPassword(password, confirmPassword);
    if (localError) {
      setError(localError);
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, confirmPassword }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? t("resetPasswordError"));
      return;
    }
    router.push(`${accountPublicPath(locale, "login")}?reset=1`);
    router.refresh();
  }

  if (token) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("resetPasswordTitle")}</CardTitle>
          <CardDescription>{t("resetPasswordDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitLegacyLink} className="space-y-4">
            <PasswordField
              id="password"
              name="password"
              label={t("newPassword")}
              required
              minLength={12}
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
            />
            <PasswordField
              id="confirmPassword"
              name="confirmPassword"
              label={t("confirmPassword")}
              required
              minLength={12}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
            <CredentialChecks password={password} check={credentialCheck} />
            <p className="text-muted-foreground text-xs">
              Use at least 12 characters. This link expires after 5 minutes and can only be used
              once.
            </p>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("saving") : t("resetPasswordSubmit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>
          {flow.state.stage === "verify" ? "Enter your reset code" : t("forgotPasswordTitle")}
        </CardTitle>
        <CardDescription>
          {flow.state.stage === "verify"
            ? passwordResetVerifyDescription({
                hasTicket: Boolean(flow.state.ticket),
                hint: flow.hint,
              })
            : "Start by requesting a 6-digit code for your account email."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {flow.state.stage === "request" ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void flow.request({ email });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {flow.error ? <p className="text-destructive text-sm">{flow.error}</p> : null}
            <Button type="submit" className="w-full" disabled={flow.busy}>
              {flow.busy ? t("sending") : "Email me a code"}
            </Button>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void flow.verify({ code });
            }}
          >
            {flow.notice ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-300">{flow.notice}</p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="resetCode">6-digit code</Label>
              <Input
                id="resetCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={12}
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
              />
            </div>
            {flow.error ? <p className="text-destructive text-sm">{flow.error}</p> : null}
            <Button type="submit" className="w-full" disabled={flow.busy}>
              {flow.busy ? "Checking…" : "Continue"}
            </Button>
          </form>
        )}
        <p className="text-muted-foreground text-center text-sm">
          <Link href={accountPublicPath(locale, "login")} className="text-primary underline">
            {t("backToSignIn")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
