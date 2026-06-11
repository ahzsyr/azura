"use client";

import { useState } from "react";
import { getSession, signIn, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { mergeLocalFavoritesToServer } from "@/features/account/lib/favorites-sync";

type Props = {
  locale: string;
  registrationEnabled: boolean;
};

export function AccountLoginForm({ locale, registrationEnabled }: Props) {
  const t = useTranslations("account");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: fd.get("email"),
      password: fd.get("password"),
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password");
      return;
    }
    const session = await getSession();
    if (session?.user?.role === "ADMIN") {
      await signOut({ redirect: false });
      setError(t("adminUseAdminLogin"));
      return;
    }
    if (session?.user?.role !== "CUSTOMER") {
      await signOut({ redirect: false });
      setError("Invalid email or password");
      return;
    }
    await mergeLocalFavoritesToServer(locale);
    const callbackUrl = searchParams.get("callbackUrl") ?? `/${locale}/account`;
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("signIn")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("password")}</Label>
              <Link
                href={`/${locale}/account/forgot-password`}
                className="text-primary text-xs underline"
              >
                {t("forgotPasswordLink")}
              </Link>
            </div>
            <Input id="password" name="password" type="password" required />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("signingIn") : t("signIn")}
          </Button>
        </form>
        {registrationEnabled ? (
          <p className="text-muted-foreground mt-4 text-center text-sm">
            {t("noAccount")}{" "}
            <Link href={`/${locale}/account/register`} className="text-primary underline">
              {t("register")}
            </Link>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
