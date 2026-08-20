"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    const form = e?.currentTarget ?? document.querySelector<HTMLFormElement>('[data-fxs-form="reset-password"]');
    if (!form) {
      setLoading(false);
      return;
    }
    const fd = new FormData(form);
    const password = fd.get("password") as string;
    const confirmPassword = fd.get("confirmPassword") as string;
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
    router.push(`/${locale}/account/login?reset=1`);
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
            <Link href={`/${locale}/account/forgot-password`}>{t("forgotPasswordTitle")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!fxsOn) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("resetPasswordTitle")}</CardTitle>
          <CardDescription>{t("resetPasswordDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                {t("newPassword")}
              </label>
              <Input id="password" name="password" type="password" required minLength={8} />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                {t("confirmPassword")}
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
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
        <FieldWrapper id="password" label={t("newPassword")} required error={error || undefined}>
          <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </FieldWrapper>
        <FieldWrapper id="confirmPassword" label={t("confirmPassword")} required>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </FieldWrapper>
      </form>
    </FormExperience>
  );
}
