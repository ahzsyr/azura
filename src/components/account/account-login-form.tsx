"use client";

import { useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordField } from "@/components/account/password-field";
import { TurnstileField } from "@/components/security/turnstile-field";
import { useTranslations } from "next-intl";
import { mergeLocalFavoritesToServer } from "@/features/account/lib/favorites-sync";
import { isCustomerRole, resolvePostLoginLanding } from "@/features/auth/portal";
import { validateEmailFormat } from "@/features/account/lib/password-form-validation";
import { accountPublicPath } from "@/features/account/account-public-path";
import { readStoredVisitorToken } from "@/features/marketing-attribution/client";

type Props = {
  locale: string;
  registrationEnabled: boolean;
  /** Site key resolved on the server; empty means no captcha is required. */
  captchaSiteKey?: string;
};

type Step = "password" | "mfa";

type OtpChannel = "email" | "sms" | "whatsapp";

const CHANNEL_LABELS: Record<OtpChannel, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

function channelButtonLabel(channel: OtpChannel): string {
  switch (channel) {
    case "email":
      return "Email me a code";
    case "sms":
      return "Text me a code";
    case "whatsapp":
      return "Send a code on WhatsApp";
  }
}

export function AccountLoginForm({ locale, registrationEnabled, captchaSiteKey = "" }: Props) {
  const t = useTranslations("account");
  const searchParams = useSearchParams();
  const captchaRequired = Boolean(captchaSiteKey.trim());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [resendBusy, setResendBusy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  // Which second factors this account can use, asked after the password step.
  const [mfaOptions, setMfaOptions] = useState<{ totpEnabled: boolean; channels: OtpChannel[] } | null>(
    null,
  );
  // Set once a delivered code has gone out, so the UI can say where it went.
  const [otpSent, setOtpSent] = useState<{ channel: OtpChannel; masked: string } | null>(null);
  const [notice, setNotice] = useState("");
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
    const redirectTo = resolvePostLoginLanding({
      role: session.user.role,
      locale,
      callbackUrl,
      mustChangePassword: session.user.mustChangePassword,
      adminOtpUnconfigured: session.user.adminOtpUnconfigured,
    });
    // Customer-only. Admins receive 403, and waiting on it delayed the handoff.
    if (isCustomerRole(session.user.role)) {
      await mergeLocalFavoritesToServer(locale);
    }
    const visitorToken = readStoredVisitorToken();
    if (visitorToken) {
      await Promise.race([
        fetch("/api/account/visitor-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorToken }),
        }).catch(() => undefined),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    }
    // A soft replace plus refresh follows the admin lifecycle redirect and
    // then refreshes the original URL, which floods history.replaceState and
    // leaves a blank page. One full navigation paints the destination.
    window.location.assign(redirectTo);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (step === "password") {
      const nextEmail = email.trim();
      const emailError = validateEmailFormat(nextEmail);
      if (emailError) {
        setError(emailError);
        setLoading(false);
        return;
      }
      if (!password) {
        setError("Enter your password");
        setLoading(false);
        return;
      }
    } else if (!/^\d{6}$/.test(mfaCode.trim()) && !/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{2}$/i.test(mfaCode.trim())) {
      setError("Enter the 6-digit code (or a recovery code)");
      setLoading(false);
      return;
    }

    if (step === "password" && captchaRequired) {
      if (!turnstileToken) {
        setError("Complete the captcha before continuing.");
        setLoading(false);
        return;
      }
      // Auth.js owns the sign-in endpoint, so the token is verified up front.
      const preflight = await fetch("/api/captcha/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turnstileToken }),
      }).catch(() => null);
      if (preflight && !preflight.ok) {
        const data = (await preflight.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Captcha failed. Please try again.");
        setTurnstileToken(null);
        setLoading(false);
        return;
      }
    }

    try {
      const result = await signIn("credentials", {
        email,
        password,
        ...(step === "mfa" && mfaCode.trim() ? { mfaCode: mfaCode.trim() } : {}),
        redirect: false,
      });

      if (result?.code === "mfa_required") {
        setStep("mfa");
        setMfaCode("");
        await loadMfaOptions({ autoSendEmail: true });
        return;
      }

      if (result?.code === "mfa_invalid") {
        setError(
          mfaOptions?.totpEnabled
            ? "That code was not accepted. Use the current code from your authenticator app."
            : "Invalid or expired code. Request a new code and try again.",
        );
        setStep("mfa");
        return;
      }

      if (result?.code === "database_unavailable") {
        setError("Cannot reach the database. Try again later.");
        return;
      }

      if (result?.code === "mfa_delivery_failed") {
        setError("Could not send the sign-in code. Try another method.");
        setStep("mfa");
        return;
      }

      if (result?.code === "mfa_unavailable") {
        setError(
          "This account has no second factor available. Contact the Master Admin to enroll an authenticator app.",
        );
        setStep("password");
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

  /**
   * Ask the server which factors are available (never sends anything unless
   * asked to). Accounts without an authenticator get their code immediately.
   */
  async function loadMfaOptions(options: { autoSendEmail?: boolean } = {}) {
    let factors: { totpEnabled: boolean; channels: OtpChannel[] } | null = null;
    try {
      const { getLoginMfaOptionsAction } = await import("@/features/auth/login-otp.actions");
      const result = await getLoginMfaOptionsAction({ email, password });
      if (result.success && result.data) {
        factors = result.data;
        setMfaOptions(result.data);
      }
    } catch {
      // Non-fatal: the user can still enter an authenticator code.
    }
    if (
      options.autoSendEmail &&
      factors &&
      !factors.totpEnabled &&
      factors.channels.includes("email")
    ) {
      await sendCode("email");
    }
  }

  /** Send a code over the chosen channel (or resend on the same one). */
  async function sendCode(channel: OtpChannel) {
    setResendBusy(true);
    setError("");
    setNotice("");
    try {
      const { sendLoginOtpAction } = await import("@/features/auth/login-otp.actions");
      const result = await sendLoginOtpAction({ email, password, channel });
      if (!result.success || !result.data) {
        setError(result.success ? "Unable to send a sign-in code." : result.error);
        return;
      }
      setOtpSent({ channel: result.data.channel, masked: result.data.maskedDestination });
      setNotice(`We sent a 6-digit code via ${CHANNEL_LABELS[channel]}. It expires in 5 minutes.`);
    } finally {
      setResendBusy(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{step === "mfa" ? "Two-step verification" : t("signIn")}</CardTitle>
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
              <p className="text-muted-foreground text-sm">
                {mfaOptions?.totpEnabled ? (
                  <>
                    Open your authenticator app and enter the current 6-digit code for{" "}
                    <span className="text-foreground">{email}</span>.
                  </>
                ) : (
                  <>Enter the 6-digit code we sent you. It expires in 5 minutes.</>
                )}
              </p>
              {notice ? (
                <p className="text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>
              ) : null}
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
                  maxLength={14}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="123456"
                />
                <p className="text-muted-foreground text-xs">
                  {mfaOptions?.totpEnabled
                    ? "Lost your authenticator? Use a recovery code, or send a sign-in code another way."
                    : "Didn't get the code? Send it again, or choose another delivery method."}
                </p>
              </div>

              {/* Fallback delivery: only rendered for channels that can deliver. */}
              {(mfaOptions?.channels.length ?? 0) > 0 || mfaOptions === null ? (
                <div className="space-y-2">
                  {(mfaOptions?.channels ?? (["email"] as OtpChannel[])).map((channel) => (
                    <Button
                      key={channel}
                      type="button"
                      variant={channel === otpSent?.channel ? "secondary" : "outline"}
                      className="w-full"
                      disabled={resendBusy}
                      onClick={() => void sendCode(channel)}
                    >
                      {resendBusy
                        ? "Sending…"
                        : channel === otpSent?.channel
                          ? `Resend code via ${CHANNEL_LABELS[channel]}`
                          : channelButtonLabel(channel)}
                    </Button>
                  ))}
                  {otpSent ? (
                    <p className="text-muted-foreground text-xs">
                      Last code sent to {otpSent.masked}. Sending a new code replaces the previous one.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("password");
                  setError("");
                  setNotice("");
                  setMfaCode("");
                  setOtpSent(null);
                  setMfaOptions(null);
                }}
              >
                Back
              </Button>
            </>
          )}
          {captchaRequired && step === "password" ? (
            <TurnstileField siteKey={captchaSiteKey} onToken={setTurnstileToken} />
          ) : null}
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
