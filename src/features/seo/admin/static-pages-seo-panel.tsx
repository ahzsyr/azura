"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { routing } from "@/i18n/routing";
import {
  getStaticSeoPage,
  isStaticSeoPageKey,
  STATIC_SEO_PAGES,
  type StaticSeoPageKey,
} from "@/features/seo/constants";
import { loadStaticPageSeoFormAction } from "@/features/seo/actions";
import { scoreSeoMeta } from "@/features/seo/scoring/seo-scoring.service";
import { SeoMetaForm } from "@/features/seo/components/seo-meta-form";
import {
  toSeoMetaFormProps,
  type SeoMetaFormPropsFromContext,
} from "@/features/seo/mappers/to-seo-meta-form-props";
import type { PageSeoContext } from "@/features/seo/page-seo-context.types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Props = {
  contextsByKey: Record<string, PageSeoContext>;
};

function resolveSelectedPageKey(pageParam: string | null): StaticSeoPageKey {
  if (pageParam && isStaticSeoPageKey(pageParam)) return pageParam;
  return STATIC_SEO_PAGES[0].pageKey;
}

function buildMinimalStaticPageFormProps(pageKey: StaticSeoPageKey): SeoMetaFormPropsFromContext {
  const page = getStaticSeoPage(pageKey) ?? STATIC_SEO_PAGES[0];
  return {
    pageKey,
    meta: null,
    translations: {},
    savedTranslations: {},
    defaultTitleEn: page.label,
    defaultTitleAr: page.label,
    defaultDescEn: "",
    defaultDescAr: "",
    previewOrigin: "",
    publicPath: page.path || "/",
  };
}

function metaStatus(context: PageSeoContext | undefined): "empty" | "partial" | "good" {
  const saved = context?.savedTranslations;
  if (!saved?.metaTitleEn?.trim() && !saved?.metaTitleAr?.trim()) return "empty";
  const { score } = scoreSeoMeta(context?.meta, saved);
  if (score >= 55) return "good";
  return "partial";
}

const statusDotClass: Record<ReturnType<typeof metaStatus>, string> = {
  empty: "bg-muted-foreground/40",
  partial: "bg-amber-500",
  good: "bg-emerald-600",
};

export function StaticPagesSeoPanel({ contextsByKey }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageParam = searchParams.get("page");
  const [query, setQuery] = useState("");
  const [selectedPageKey, setSelectedPageKey] = useState<StaticSeoPageKey>(() =>
    resolveSelectedPageKey(pageParam),
  );
  const [loadedFormProps, setLoadedFormProps] = useState<SeoMetaFormPropsFromContext | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingForm, setIsLoadingForm] = useState(false);

  useEffect(() => {
    setSelectedPageKey(resolveSelectedPageKey(pageParam));
  }, [pageParam]);

  const selectedPage = getStaticSeoPage(selectedPageKey) ?? STATIC_SEO_PAGES[0];
  const serverContext = contextsByKey[selectedPageKey];
  const serverFormProps = useMemo(
    () => (serverContext ? toSeoMetaFormProps(serverContext) : null),
    [serverContext],
  );

  useEffect(() => {
    if (serverFormProps) {
      setLoadedFormProps(null);
      setLoadError(null);
      setIsLoadingForm(false);
      return;
    }

    let cancelled = false;
    setIsLoadingForm(true);
    setLoadError(null);

    void loadStaticPageSeoFormAction(selectedPageKey)
      .then((props) => {
        if (cancelled) return;
        setLoadedFormProps(props);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadedFormProps(null);
        setLoadError(error instanceof Error ? error.message : "Failed to load SEO settings.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingForm(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPageKey, serverFormProps]);

  const formProps = serverFormProps ?? loadedFormProps ?? buildMinimalStaticPageFormProps(selectedPageKey);

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

  const setSelectedPage = useCallback(
    (pageKey: StaticSeoPageKey) => {
      setSelectedPageKey(pageKey);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "pages");
      params.set("page", pageKey);
      router.replace(`/admin/seo/metadata?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const previewPath = `/${routing.defaultLocale}${selectedPage.path}`;
  const cmsPageId = serverContext?.identity.cmsPageId ?? loadedFormProps?.cmsPageId;

  const pageList = (
    <ul className="space-y-0.5 p-1">
      {filteredPages.map((page) => {
        const isActive = page.pageKey === selectedPageKey;
        const status = metaStatus(contextsByKey[page.pageKey]);
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
            <div className="flex flex-col items-end gap-1">
              <Link
                href={previewPath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Preview
                <ExternalLink className="h-3 w-3" aria-hidden />
              </Link>
              {cmsPageId ? (
                <Link
                  href={`/admin/pages/${cmsPageId}?tab=seo`}
                  className="text-xs text-muted-foreground hover:text-primary hover:underline"
                >
                  Edit in page editor
                </Link>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingForm && !serverFormProps && !loadedFormProps ? (
            <div className="space-y-3 py-4">
              <div className="h-10 animate-pulse rounded-md bg-muted/60" />
              <div className="h-24 animate-pulse rounded-md bg-muted/60" />
              <div className="h-10 animate-pulse rounded-md bg-muted/60" />
            </div>
          ) : loadError && !serverFormProps && !loadedFormProps ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {loadError}
            </p>
          ) : (
            <SeoMetaForm
              key={selectedPageKey}
              {...formProps}
              embedded
              useTopBarActions
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
