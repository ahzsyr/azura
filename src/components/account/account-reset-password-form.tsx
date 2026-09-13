"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordField } from "@/components/account/password-field";
import { validateNewPassword } from "@/features/account/lib/password-form-validation";
import { accountPublicPath } from "@/features/account/account-public-path";
import {
  FieldWrapper,
  FormExperience,
  isFxsEnabled,
} from "@/features/forms/fxs";

type Props = {
  locale: string;
};

export function AccountResetPasswordForm({ locale }: Props) {
  const t = useTranslations("account");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fxsOn = isFxsEnabled();

  async function handleSubmit(e?: React.FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    if (!token) {
      setError(t("resetTokenMissing"));
      return;
    }
    setLoading(true);
    setError("");
    const form =
      e?.currentTarget ??
      document.querySelector<HTMLFormElement>('[data-fxs-form="reset-password"]');
    if (!form) {
      setLoading(false);
      return;
    }
    const fd = new FormData(form);
    const password = String(fd.get("password") ?? "");
    const confirmPassword = String(fd.get("confirmPassword") ?? "");

    const localError = validateNewPassword(password, confirmPassword);
    if (localError) {
      setError(localError);
      setLoading(false);
      return;
    }

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

  if (!token) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("resetPasswordTitle")}</CardTitle>
          <CardDescription>{t("resetTokenMissing")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href={accountPublicPath(locale, "forgot-password")}>{t("forgotPasswordTitle")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const fields = (
    <>
      <PasswordField
        id="password"
        name="password"
        label={t("newPassword")}
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
      <p className="text-muted-foreground text-xs">
        Use at least 12 characters. Links expire after 5 minutes and can only be used once.
      </p>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </>
  );

  if (!fxsOn) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("resetPasswordTitle")}</CardTitle>
          <CardDescription>{t("resetPasswordDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("saving") : t("resetPasswordSubmit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <FormExperience
      className="mx-auto w-full max-w-md"
      config={{
        title: t("resetPasswordTitle"),
        description: t("resetPasswordDescription"),
        layoutMode: "centered",
        theme: "minimal",
        estimatedMinutes: 1,
      }}
      status={loading ? "submitting" : "idle"}
      sticky={{
        primaryLabel: loading ? t("saving") : t("resetPasswordSubmit"),
        loading,
        onPrimary: () => void handleSubmit(),
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-4" data-fxs-form="reset-password" noValidate>
        <FieldWrapper id="password" label={t("newPassword")} required>
          <PasswordField
            id="password"
            name="password"
            required
            minLength={12}
            autoComplete="new-password"
            className="space-y-0"
          />
        </FieldWrapper>
        <FieldWrapper id="confirmPassword" label={t("confirmPassword")} required>
          <PasswordField
            id="confirmPassword"
            name="confirmPassword"
            required
            minLength={12}
            autoComplete="new-password"
            className="space-y-0"
          />
        </FieldWrapper>
        <p className="text-muted-foreground text-xs">
          Use at least 12 characters. Links expire after 5 minutes and can only be used once.
        </p>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </form>
    </FormExperience>
  );
}
