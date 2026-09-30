"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccountNav } from "@/components/account/account-nav";
import { accountPublicPath } from "@/features/account/account-public-path";
import { publicLocalePath } from "@/i18n/url-helpers";

type RequestRow = {
  id: string;
  kind: "inquiry" | "quote";
  label: string;
  status: string;
  summary: string;
  createdAt: string;
};

type Props = { locale: string };

export function AccountRequestsPage({ locale }: Props) {
  const t = useTranslations("account");
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch("/api/account/requests");
      if (res.ok) {
        const data = (await res.json()) as { requests?: RequestRow[] };
        setRows(data.requests ?? []);
      }
      setLoading(false);
    }
    void load();
  }, []);

  return (
    <div className="container-premium py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">{t("requestsTitle")}</h1>
          <p className="text-muted-foreground mt-1">{t("requestsDescription")}</p>
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
      <Card>
        <CardHeader>
          <CardTitle>{t("navRequests")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-sm">{t("saving")}</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("requestsEmpty")}</p>
          ) : (
            rows.map((row) => (
              <Link
                key={`${row.kind}-${row.id}`}
                href={`${accountPublicPath(locale, `requests/${row.id}`)}?kind=${row.kind}`}
                className="block rounded-lg border p-4 text-sm transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {row.kind === "quote" ? t("requestKindQuote") : t("requestKindInquiry")}
                    </Badge>
                    <Badge variant="secondary">{row.status}</Badge>
                  </div>
                </div>
                {row.summary ? (
                  <p className="text-muted-foreground mt-2 line-clamp-2">{row.summary}</p>
                ) : null}
                <p className="text-muted-foreground mt-2 text-xs">
                  {new Date(row.createdAt).toLocaleString()}
                </p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
