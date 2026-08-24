"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccountNav } from "@/components/account/account-nav";

type Props = {
  locale: string;
  requestId: string;
};

type Detail =
  | {
      kind: "inquiry";
      id: string;
      type: string;
      message: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      linkedContent?: { id: string; slug: string | null; title?: string } | null;
    }
  | {
      kind: "quote";
      id: string;
      label: string;
      status: string;
      payload: Record<string, unknown>;
      createdAt: string;
      updatedAt: string;
    };

export function AccountRequestDetailPage({ locale, requestId }: Props) {
  const t = useTranslations("account");
  const searchParams = useSearchParams();
  const kind = searchParams.get("kind") === "quote" ? "quote" : "inquiry";
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      const res = await fetch(
        `/api/account/requests/${encodeURIComponent(requestId)}?kind=${kind}`,
      );
      if (!res.ok) {
        setError(t("requestNotFound"));
        setDetail(null);
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { request?: Detail };
      setDetail(data.request ?? null);
      setLoading(false);
    }
    void load();
  }, [requestId, kind, t]);

  return (
    <div className="container-premium py-12">
      <div className="mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href={`/${locale}/account/requests`}>{t("backToRequests")}</Link>
        </Button>
      </div>
      <AccountNav locale={locale} />
      <Card>
        <CardHeader>
          <CardTitle>{t("requestDetailTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {loading ? (
            <p className="text-muted-foreground">{t("saving")}</p>
          ) : error || !detail ? (
            <p className="text-destructive">{error || t("requestNotFound")}</p>
          ) : detail.kind === "inquiry" ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{t("requestKindInquiry")}</Badge>
                <Badge variant="secondary">{detail.status}</Badge>
                <Badge variant="outline">{detail.type}</Badge>
              </div>
              <p className="whitespace-pre-wrap">{detail.message}</p>
              {detail.linkedContent?.slug ? (
                <Button asChild variant="link" className="px-0">
                  <Link href={`/${locale}/packages/${detail.linkedContent.slug}`}>
                    {detail.linkedContent.title ?? t("viewLinkedContent")}
                  </Link>
                </Button>
              ) : null}
              <p className="text-muted-foreground text-xs">
                {t("requestCreatedAt")}: {new Date(detail.createdAt).toLocaleString()}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("requestUpdatedAt")}: {new Date(detail.updatedAt).toLocaleString()}
              </p>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{t("requestKindQuote")}</Badge>
                <Badge variant="secondary">{detail.status}</Badge>
              </div>
              <p className="font-medium">{detail.label}</p>
              <dl className="space-y-2">
                {Object.entries(detail.payload).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-muted-foreground text-xs uppercase tracking-wide">
                      {key}
                    </dt>
                    <dd>{String(value ?? "")}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-muted-foreground text-xs">
                {t("requestCreatedAt")}: {new Date(detail.createdAt).toLocaleString()}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("requestUpdatedAt")}: {new Date(detail.updatedAt).toLocaleString()}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
