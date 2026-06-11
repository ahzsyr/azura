"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SeoMeta } from "@prisma/client";
import { ExternalLink } from "lucide-react";
import { routing } from "@/i18n/routing";
import {
  getStaticSeoPage,
  isStaticSeoPageKey,
  STATIC_SEO_PAGES,
  type StaticSeoPageKey,
} from "@/features/seo/constants";
import { scoreSeoMeta } from "@/features/seo/scoring/seo-scoring.service";
import { SeoMetaForm } from "@/features/seo/components/seo-meta-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Props = {
  metaByKey: Record<string, SeoMeta>;
};

function resolveSelectedPageKey(pageParam: string | null): StaticSeoPageKey {
  if (pageParam && isStaticSeoPageKey(pageParam)) return pageParam;
  return STATIC_SEO_PAGES[0].pageKey;
}

function metaStatus(meta: SeoMeta | undefined): "empty" | "partial" | "good" {
  if (!meta?.titleEn?.trim() && !meta?.titleAr?.trim()) return "empty";
  const { score } = scoreSeoMeta(meta);
  if (score >= 55) return "good";
  return "partial";
}

const statusDotClass: Record<ReturnType<typeof metaStatus>, string> = {
  empty: "bg-muted-foreground/40",
  partial: "bg-amber-500",
  good: "bg-emerald-600",
};

export function StaticPagesSeoPanel({ metaByKey }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageParam = searchParams.get("page");
  const [query, setQuery] = useState("");

  const selectedPageKey = useMemo(() => resolveSelectedPageKey(pageParam), [pageParam]);
  const selectedPage = getStaticSeoPage(selectedPageKey) ?? STATIC_SEO_PAGES[0];

  const filteredPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...STATIC_SEO_PAGES];
    return STATIC_SEO_PAGES.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.pageKey.toLowerCase().includes(q) ||
        p.path.toLowerCase().includes(q),
    );
  }, [query]);

  const setSelectedPage = (pageKey: StaticSeoPageKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "pages");
    params.set("page", pageKey);
    router.replace(`/admin/seo?${params.toString()}`, { scroll: false });
  };

  const previewPath = `/${routing.defaultLocale}${selectedPage.path}`;
  const selectedMeta = metaByKey[selectedPageKey] ?? null;

  const pageList = (
    <ul className="space-y-0.5 p-1">
      {filteredPages.map((page) => {
        const isActive = page.pageKey === selectedPageKey;
        const status = metaStatus(metaByKey[page.pageKey]);
        return (
          <li key={page.pageKey}>
            <button
              type="button"
              onClick={() => setSelectedPage(page.pageKey)}
              className={cn(
                "flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-start text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span
                className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", statusDotClass[status])}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium leading-tight">{page.label}</span>
                <span className="mt-0.5 block truncate text-xs opacity-80">
                  {page.path || "/"}
                </span>
              </span>
            </button>
          </li>
        );
      })}
      {filteredPages.length === 0 && (
        <li className="px-2 py-4 text-center text-xs text-muted-foreground">No pages match.</li>
      )}
    </ul>
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(200px,240px)_1fr] md:gap-6">
      <div className="md:hidden">
        <label htmlFor="static-seo-page-select" className="mb-1.5 block text-sm font-medium">
          Page
        </label>
        <select
          id="static-seo-page-select"
          value={selectedPageKey}
          onChange={(e) => {
            const key = e.target.value;
            if (isStaticSeoPageKey(key)) setSelectedPage(key);
          }}
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        >
          {STATIC_SEO_PAGES.map((page) => (
            <option key={page.pageKey} value={page.pageKey}>
              {page.label}
              {page.path ? ` (${page.path})` : " (/)"}
            </option>
          ))}
        </select>
      </div>

      <aside className="hidden flex-col md:flex md:sticky md:top-24 md:max-h-[calc(100vh-12rem)]">
        <Input
          type="search"
          placeholder="Search pages…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-2 shrink-0"
          aria-label="Search static pages"
        />
        <ScrollArea className="min-h-0 flex-1 rounded-xl border bg-card">
          {pageList}
        </ScrollArea>
      </aside>

      <Card className="min-w-0">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-lg">{selectedPage.label}</CardTitle>
              <CardDescription className="mt-1 font-mono text-xs">
                {selectedPage.path || "/"}
                <span className="mx-2 text-muted-foreground">·</span>
                {selectedPage.pageKey}
              </CardDescription>
            </div>
            <Link
              href={previewPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Preview
              <ExternalLink className="h-3 w-3" aria-hidden />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <SeoMetaForm
            key={selectedPageKey}
            pageKey={selectedPageKey}
            meta={selectedMeta}
            defaultTitleEn={selectedPage.label}
            defaultTitleAr={selectedPage.label}
          />
        </CardContent>
      </Card>
    </div>
  );
}
