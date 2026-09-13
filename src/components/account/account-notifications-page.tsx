"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AccountNav } from "@/components/account/account-nav";
import { accountPublicPath } from "@/features/account/account-public-path";
import { publicLocalePath } from "@/i18n/url-helpers";

type ActivityRow = {
  id: string;
  kind: "inquiry" | "quote" | "booking";
  label: string;
  status: string;
  at: string;
};

type Props = { locale: string };

export function AccountNotificationsPage({ locale }: Props) {
  const t = useTranslations("account");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch("/api/account/notifications");
      if (res.ok) {
        const data = (await res.json()) as {
          preferences?: { marketingOptIn?: boolean };
          activity?: ActivityRow[];
        };
        setMarketingOptIn(Boolean(data.preferences?.marketingOptIn));
        setActivity(data.activity ?? []);
      }
      setLoading(false);
    }
    void load();
  }, []);

  async function savePrefs(next: boolean) {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/account/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketingOptIn: next }),
    });
    setSaving(false);
    if (!res.ok) {
      setMessage(t("notificationsSaveFailed"));
      return;
    }
    setMarketingOptIn(next);
    setMessage(t("notificationsSaved"));
  }

  return (
    <div className="container-premium py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">{t("notificationsTitle")}</h1>
          <p className="text-muted-foreground mt-1">{t("notificationsDescription")}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void signOut({ callbackUrl: publicLocalePath(locale, "/") })}
        >
          {t("signOut")}
        </Button>
      </div>
      <AccountNav locale={locale} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("notificationPreferences")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-muted-foreground text-sm">{t("saving")}</p>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <input
                    id="marketingOptIn"
                    type="checkbox"
                    className="mt-1"
                    checked={marketingOptIn}
                    disabled={saving}
                    onChange={(e) => void savePrefs(e.target.checked)}
                  />
                  <Label htmlFor="marketingOptIn" className="font-normal leading-snug">
                    {t("marketingOptIn")}
                  </Label>
                </div>
                {message ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p> : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("activityTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-muted-foreground text-sm">{t("saving")}</p>
            ) : activity.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("activityEmpty")}</p>
            ) : (
              activity.map((row) => (
                <Link
                  key={`${row.kind}-${row.id}-${row.at}`}
                  href={
                    row.kind === "booking"
                      ? accountPublicPath(locale, "bookings")
                      : `${accountPublicPath(locale, `requests/${row.id}`)}?kind=${row.kind}`
                  }
                  className="block rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{row.label}</span>
                    <span className="text-muted-foreground">{row.status}</span>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {new Date(row.at).toLocaleString()}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
