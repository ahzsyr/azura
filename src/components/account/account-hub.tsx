import Link from "next/link";
import { User } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  locale: string;
  registrationEnabled: boolean;
  isAdminSession?: boolean;
};

export async function AccountHub({ locale, registrationEnabled, isAdminSession = false }: Props) {
  const t = await getTranslations("account");
  const base = `/${locale}/account`;

  if (isAdminSession) {
    return (
      <div className="container-premium py-16">
        <Card className="mx-auto max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full border bg-muted/50">
              <User className="size-6 text-muted-foreground" aria-hidden />
            </div>
            <CardTitle>{t("hubTitle")}</CardTitle>
            <CardDescription>{t("adminSeparateNotice")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/admin">{t("adminPanelLink")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-premium py-16">
      <Card className="mx-auto max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full border bg-muted/50">
            <User className="size-6 text-muted-foreground" aria-hidden />
          </div>
          <CardTitle>{t("hubTitle")}</CardTitle>
          <CardDescription>{t("hubDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link href={`${base}/login`}>{t("signIn")}</Link>
          </Button>
          {registrationEnabled ? (
            <Button asChild variant="outline" className="w-full">
              <Link href={`${base}/register`}>{t("register")}</Link>
            </Button>
          ) : null}
          <p className="text-center text-sm">
            <Link href={`${base}/forgot-password`} className="text-primary underline">
              {t("forgotPasswordLink")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
