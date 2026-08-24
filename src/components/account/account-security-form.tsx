"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountNav } from "@/components/account/account-nav";
import { PasswordField } from "@/components/account/password-field";

type Props = {
  locale: string;
};

export function AccountSecurityForm({ locale }: Props) {
  const t = useTranslations("account");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [revokePassword, setRevokePassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/account/profile");
      if (!res.ok) return;
      const data = (await res.json()) as {
        user?: { pendingEmail?: string | null };
      };
      setPendingEmail(data.user?.pendingEmail ?? null);
    })();
  }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(t("profileSaveFailed"));
      return;
    }
    setMessage(t("passwordChangedSignInAgain"));
    setTimeout(() => {
      void signOut({ callbackUrl: `/${locale}/account/login` });
    }, 1200);
  }

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/account/email-change", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: emailPassword,
        newEmail,
        locale,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      pendingEmail?: string;
    };
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? t("emailChangeFailed"));
      return;
    }
    setPendingEmail(data.pendingEmail ?? newEmail);
    setMessage(t("emailChangePending", { email: data.pendingEmail ?? newEmail }));
    setNewEmail("");
    setEmailPassword("");
  }

  async function revokeAll(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/account/sessions/revoke-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: revokePassword }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? t("profileSaveFailed"));
      return;
    }
    setMessage(t("signOutEverywhereDone"));
    void signOut({ callbackUrl: `/${locale}/account/login` });
  }

  return (
    <div className="container-premium py-12">
      <AccountNav locale={locale} />
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="font-heading text-3xl font-bold">{t("securityTitle")}</h1>
        {pendingEmail ? (
          <p className="text-muted-foreground text-sm">
            {t("pendingEmailLabel")}: <span className="font-mono text-foreground">{pendingEmail}</span>
          </p>
        ) : null}
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>{t("changePassword")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="space-y-4">
              <PasswordField
                id="currentPassword"
                label={t("currentPassword")}
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                required
              />
              <PasswordField
                id="newPassword"
                label={t("newPassword")}
                value={newPassword}
                onChange={setNewPassword}
                minLength={12}
                autoComplete="new-password"
                required
              />
              <PasswordField
                id="confirmPassword"
                label={t("confirmPassword")}
                value={confirmPassword}
                onChange={setConfirmPassword}
                minLength={12}
                autoComplete="new-password"
                required
              />
              <Button type="submit" disabled={loading}>
                {t("changePassword")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("changeEmail")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={changeEmail} className="space-y-4">
              <PasswordField
                id="emailPassword"
                label={t("currentPassword")}
                value={emailPassword}
                onChange={setEmailPassword}
                autoComplete="current-password"
                required
              />
              <div className="space-y-2">
                <Label htmlFor="newEmail">{t("newEmail")}</Label>
                <Input
                  id="newEmail"
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {t("changeEmail")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("signOutEverywhere")}</CardTitle>
            <CardDescription>{t("signOutEverywhereHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={revokeAll} className="space-y-4">
              <PasswordField
                id="revokePassword"
                label={t("currentPassword")}
                value={revokePassword}
                onChange={setRevokePassword}
                autoComplete="current-password"
                required
              />
              <Button type="submit" variant="destructive" disabled={loading}>
                {t("signOutEverywhere")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Button
          type="button"
          variant="outline"
          onClick={() => void signOut({ callbackUrl: `/${locale}` })}
        >
          {t("signOut")}
        </Button>
      </div>
    </div>
  );
}
