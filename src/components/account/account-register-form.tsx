"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TurnstileField } from "@/components/security/turnstile-field";
import { PasswordField } from "@/components/account/password-field";
import {
  validateEmailFormat,
  validateNewPassword,
} from "@/features/account/lib/password-form-validation";

type Props = {
  locale: string;
};

export function AccountRegisterForm({ locale }: Props) {
  const t = useTranslations("account");
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);
  const onTurnstileToken = useCallback((token: string | null) => {
    setTurnstileToken(token);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirmPassword") ?? "");
    const email = String(fd.get("email") ?? "").trim();

    if (name.length < 2) {
      setError("Name must be at least 2 characters");
      setLoading(false);
      return;
    }
    const emailError = validateEmailFormat(email);
    if (emailError) {
      setError(emailError);
      setLoading(false);
      return;
    }
    const passwordError = validateNewPassword(password, confirm);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }
    if (!turnstileToken) {
      setError("Complete the captcha before continuing.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        locale,
        turnstileToken,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? t("registerFailed"));
      return;
    }
    setCheckEmail(email);
  }

  async function resend() {
    if (!checkEmail) return;
    setResendBusy(true);
    setResendMessage("");
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: checkEmail, locale }),
    });
    setResendBusy(false);
    setResendMessage("A new code was sent if the account needs verification.");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!checkEmail) return;
    setVerifyBusy(true);
    setError("");
    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: checkEmail, code }),
    });
    setVerifyBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? t("verifyEmailFailed"));
      return;
    }
    router.replace(`/${locale}/account/login?verified=1`);
  }

  if (checkEmail) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{t("checkYourEmailTitle")}</CardTitle>
          <CardDescription>
            Enter the 6-digit code we sent to {checkEmail}. It expires in 5 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={verifyCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification code</Label>
              <Input
                id="otp"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                pattern="\d{6}"
                autoFocus
              />
            </div>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            {resendMessage ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-300">{resendMessage}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={verifyBusy || code.length !== 6}>
              {verifyBusy ? t("verifyEmailWorking") : "Verify email"}
            </Button>
          </form>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={resendBusy}
            onClick={() => void resend()}
          >
            {resendBusy ? t("sending") : t("resendVerification")}
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <Link href={`/${locale}/account/login`} className="text-primary text-sm underline">
            {t("signIn")}
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full border bg-primary/5">
          <UserPlus className="size-6 text-primary" aria-hidden />
        </div>
        <CardTitle>{t("registerTitle")}</CardTitle>
        <CardDescription>{t("registerDescription")}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input id="name" name="name" required minLength={2} maxLength={80} autoComplete="name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <PasswordField
            id="password"
            name="password"
            label={t("password")}
            required
            minLength={12}
            autoComplete="new-password"
          />
          <PasswordField
            id="confirmPassword"
            name="confirmPassword"
            label={t("confirmPassword")}
            required
            minLength={12}
            autoComplete="new-password"
          />
          <TurnstileField onToken={onTurnstileToken} />
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("creating") : t("register")}
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            {t("alreadyHaveAccount")}{" "}
            <Link href={`/${locale}/account/login`} className="text-primary font-medium underline">
              {t("signIn")}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
