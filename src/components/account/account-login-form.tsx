"use client";

import { useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordField } from "@/components/account/password-field";
import { useTranslations } from "next-intl";
import { mergeLocalFavoritesToServer } from "@/features/account/lib/favorites-sync";
import { resolvePostLoginRedirect } from "@/features/auth/portal";
import { validateEmailFormat } from "@/features/account/lib/password-form-validation";
import { accountPublicPath } from "@/features/account/account-public-path";

type Props = {
  locale: string;
  registrationEnabled: boolean;
};

type Step = "password" | "mfa";

export function AccountLoginForm({ locale, registrationEnabled }: Props) {
  const t = useTranslations("account");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resendBusy, setResendBusy] = useState(false);
  const resetSuccess = searchParams.get("reset") === "1";
  const verifiedSuccess = searchParams.get("verified") === "1";

  async function completeLogin() {
    let session = await getSession();
    if (!session?.user?.id) {
      await new Promise((r) => setTimeout(r, 150));
      session = await getSession();
    }
    if (!session?.user?.id) {
      setError("Signed in, but the session could not be read. Refresh and try again.");
      return;
    }

    const callbackUrl = searchParams.get("callbackUrl");
    const redirectTo = resolvePostLoginRedirect({
      role: session.user.role,
      locale,
      callbackUrl,
    });
    await mergeLocalFavoritesToServer(locale);
    router.replace(redirectTo);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const nextEmail = String(fd.get("email") ?? email).trim();
    const nextPassword = String(fd.get("password") ?? password);
    const mfaCode = String(fd.get("mfaCode") ?? "").trim();

    if (step === "password") {
      const emailError = validateEmailFormat(nextEmail);
      if (emailError) {
        setError(emailError);
        setLoading(false);
        return;
      }
      if (!nextPassword) {
        setError("Enter your password");
        setLoading(false);
        return;
      }
    } else if (!/^\d{6}$/.test(mfaCode)) {
      setError("Enter the 6-digit code from your email");
      setLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        email: nextEmail,
        password: nextPassword,
        ...(mfaCode ? { mfaCode } : {}),
        redirect: false,
      });

      if (result?.code === "mfa_required") {
        setEmail(nextEmail);
        setPassword(nextPassword);
        setStep("mfa");
        setError("");
        return;
      }

      if (result?.code === "mfa_invalid") {
        setError("Invalid or expired code. Request a new code and try again.");
        setStep("mfa");
        return;
      }

      if (result?.code === "database_unavailable") {
        setError("Cannot reach the database. Try again later.");
        return;
      }

      if (result?.error || result?.ok === false) {
        setError("Invalid email or password");
        return;
      }

      await completeLogin();
    } catch (err) {
      console.error("[account-login]", err);
      setError("Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setResendBusy(true);
    setError("");
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.code === "mfa_required") {
        setError("");
      } else if (result?.error || result?.ok === false) {
        setError("Could not resend code. Sign in again.");
        setStep("password");
      }
    } finally {
      setResendBusy(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{step === "mfa" ? "Email verification code" : t("signIn")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {resetSuccess ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Password updated. Sign in with your new password.
            </p>
          ) : null}
          {verifiedSuccess ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Email verified. You can sign in now.
            </p>
          ) : null}
          {step === "password" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t("password")}</Label>
                  <Link
                    href={accountPublicPath(locale, "forgot-password")}
                    className="text-primary text-xs underline"
                  >
                    {t("forgotPasswordLink")}
                  </Link>
                </div>
                <PasswordField
                  id="password"
                  name="password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                  required
                  className="space-y-0"
                />
              </div>
            </>
          ) : (
            <>
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="password" value={password} />
              <p className="text-muted-foreground text-sm">
                We sent a 6-digit code to your email. It expires in 5 minutes.
              </p>
              <div className="space-y-2">
                <Label htmlFor="mfaCode">Verification code</Label>
                <Input
                  id="mfaCode"
                  name="mfaCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  autoFocus
                  maxLength={6}
                  pattern="\d{6}"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={resendBusy}
                onClick={() => void resendOtp()}
              >
                {resendBusy ? "Sending…" : "Resend code"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("password");
                  setError("");
                }}
              >
                Back
              </Button>
            </>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("signingIn") : step === "mfa" ? "Verify" : t("signIn")}
          </Button>
        </form>
        {registrationEnabled && step === "password" ? (
          <p className="text-muted-foreground mt-4 text-center text-sm">
            {t("noAccount")}{" "}
            <Link href={accountPublicPath(locale, "register")} className="text-primary underline">
              {t("register")}
            </Link>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
