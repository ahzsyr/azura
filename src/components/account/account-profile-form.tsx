"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountNav } from "@/components/account/account-nav";

type Profile = {
  name: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  marketingOptIn: boolean;
};

type Props = {
  locale: string;
};

function toDateInput(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function AccountProfileForm({ locale }: Props) {
  const t = useTranslations("account");
  const [form, setForm] = useState<Profile | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/account/profile");
      if (!res.ok) {
        setError(t("profileSaveFailed"));
        return;
      }
      const data = (await res.json()) as { user: Profile & { dateOfBirth?: string | null } };
      const u = data.user;
      setForm({
        name: u.name,
        email: u.email,
        phone: u.phone,
        dateOfBirth: toDateInput(u.dateOfBirth ?? null),
        addressLine1: u.addressLine1,
        addressLine2: u.addressLine2,
        city: u.city,
        state: u.state,
        postalCode: u.postalCode,
        country: u.country,
        marketingOptIn: u.marketingOptIn,
      });
    })();
  }, [t]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        ...(form.phone && form.phone.length >= 6 ? { phone: form.phone } : {}),
        ...(form.dateOfBirth ? { dateOfBirth: form.dateOfBirth } : {}),
        ...(form.addressLine1 && form.addressLine1.length >= 2
          ? { addressLine1: form.addressLine1 }
          : {}),
        addressLine2: form.addressLine2 ?? "",
        ...(form.city ? { city: form.city } : {}),
        state: form.state ?? "",
        postalCode: form.postalCode ?? "",
        ...(form.country && form.country.length >= 2 ? { country: form.country } : {}),
        marketingOptIn: form.marketingOptIn,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(t("profileSaveFailed"));
      return;
    }
    setMessage(t("profileSaved"));
  }

  return (
    <div className="container-premium py-12">
      <AccountNav locale={locale} />
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>{t("profileTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!form ? (
            <p className="text-muted-foreground text-sm">{t("saving")}</p>
          ) : (
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("name")}</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input id="email" value={form.email} disabled />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("phone")}</Label>
                  <Input
                    id="phone"
                    value={form.phone ?? ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">{t("dateOfBirth")}</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={form.dateOfBirth ?? ""}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressLine1">{t("addressLine1")}</Label>
                <Input
                  id="addressLine1"
                  value={form.addressLine1 ?? ""}
                  onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressLine2">{t("addressLine2")}</Label>
                <Input
                  id="addressLine2"
                  value={form.addressLine2 ?? ""}
                  onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">{t("city")}</Label>
                  <Input
                    id="city"
                    value={form.city ?? ""}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">{t("country")}</Label>
                  <Input
                    id="country"
                    value={form.country ?? ""}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.marketingOptIn}
                  onChange={(e) => setForm({ ...form, marketingOptIn: e.target.checked })}
                />
                {t("marketingOptIn")}
              </label>
              {error ? <p className="text-destructive text-sm">{error}</p> : null}
              {message ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p> : null}
              <Button type="submit" disabled={loading}>
                {loading ? t("saving") : t("profileTitle")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
