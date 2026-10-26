"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordField } from "@/components/account/password-field";
import { TurnstileField } from "@/components/security/turnstile-field";
import { CredentialChecks, useCredentialCheck } from "@/components/security/credential-checks";
import { validateEmailFormat, validateNewPassword } from "@/features/account/lib/password-form-validation";
import { accountPublicPath } from "@/features/account/account-public-path";
import { usePasswordResetFlow } from "@/components/account/use-password-reset-flow";

type Props = {
  locale: string;
  /** Site key resolved on the server; empty means no captcha is required. */
  captchaSiteKey?: string;
};

/**
 * "Forgot password" → emailed code → new password, in one card.
 *
 * This is the reset entry point for every role. The copy is deliberately
 * generic: it describes the next step the browser can take, never whether the
 * address has an account.
 */
export function AccountForgotPasswordForm({ locale, captchaSiteKey = "" }: Props) {
  const t = useTranslations("account");
  const captchaRequired = Boolean(captchaSiteKey.trim());
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const credentialCheck = useCredentialCheck({ password, confirmPassword });
  const flow = usePasswordResetFlow({ locale, redirectToLogin: false });

  const onTurnstileToken = useCallback((token: string | null) => {
    setTurnstileToken(token);
  }, []);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    flow.setError("");
    const emailError = validateEmailFormat(email);
    if (emailError) {
      flow.setError(emailError);
      return;
    }
    if (captchaRequired && !turnstileToken) {
      flow.setError("Complete the captcha before continuing.");
      return;
    }
    await flow.request({ email, turnstileToken });
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      flow.setError("Enter the 6-digit code from the email.");
      return;
    }
    await flow.verify({ code });
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    const localError = validateNewPassword(password, confirmPassword);
    if (localError) {
      flow.setError(localError);
      return;
    }
    await flow.complete({ password, confirmPassword });
  }

  const title =
    flow.state.stage === "verify"
      ? "Enter your reset code"
      : flow.state.stage === "password"
        ? t("resetPasswordTitle")
        : t("forgotPasswordTitle");

  const description =
    flow.state.stage === "verify"
      ? `We emailed a 6-digit code${flow.hint ? ` to ${flow.hint}` : ""}. It expires in 10 minutes.`
      : flow.state.stage === "password"
        ? "Choose a new password. Two-step verification will be turned off and must be set up again at your next sign-in."
        : "Enter your email and we will email you a 6-digit code to reset your password.";

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {flow.notice && flow.stage === "verify" ? (
          <p className="mb-4 text-sm text-emerald-700 dark:text-emerald-300">{flow.notice}</p>
        ) : null}

        {flow.state.stage === "request" ? (
          <form onSubmit={submitEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <TurnstileField onToken={onTurnstileToken} siteKey={captchaSiteKey} />
            {flow.error && <p className="text-destructive text-sm">{flow.error}</p>}
            <Button type="submit" className="w-full" disabled={flow.busy}>
              {flow.busy ? t("sending") : "Email me a code"}
            </Button>
          </form>
        ) : null}

        {flow.state.stage === "verify" ? (
          <form onSubmit={submitCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resetCode">6-digit code</Label>
              <Input
                id="resetCode"
                name="resetCode"
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
            {flow.error && <p className="text-destructive text-sm">{flow.error}</p>}
            <Button type="submit" className="w-full" disabled={flow.busy}>
              {flow.busy ? "Checking…" : "Continue"}
            </Button>
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <Button type="button" variant="ghost" onClick={flow.restart} disabled={flow.busy}>
                Use a different email
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={flow.busy}
                onClick={() => void flow.request({ email: flow.state.email })}
              >
                Resend code
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              No code? Check spam, or resend. Codes can be requested a few times per hour.
            </p>
          </form>
        ) : null}

        {flow.state.stage === "password" ? (
          <form onSubmit={submitPassword} className="space-y-4">
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
              Use at least 12 characters. After resetting, two-step verification is off — set it
              up again from Security after you sign in.
            </p>
            {flow.error && <p className="text-destructive text-sm">{flow.error}</p>}
            <Button type="submit" className="w-full" disabled={flow.busy}>
              {flow.busy ? t("saving") : t("resetPasswordSubmit")}
            </Button>
          </form>
        ) : null}

        {flow.state.stage === "done" ? (
          <div className="space-y-4">
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Password updated. Sign in with your new password.
            </p>
            <Button asChild className="w-full">
              <Link href={accountPublicPath(locale, "login")}>{t("signIn")}</Link>
            </Button>
          </div>
        ) : null}

        <p className="text-muted-foreground mt-4 text-center text-sm">
          <Link href={accountPublicPath(locale, "login")} className="text-primary underline">
            {t("backToSignIn")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
