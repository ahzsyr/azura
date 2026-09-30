"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  COMPARE_CHANGED_EVENT,
  clearCompareList,
  getCompareBucketsSummary,
  getCompareStore,
} from "@/features/comparison/comparison-store";
import { ComparisonPage } from "@/features/comparison/components/comparison-page";
import type { ComparisonPageLabels } from "@/features/comparison/components/comparison-page";
import type { CompareFieldMeta, ComparisonMode } from "@/features/comparison/types";
import {
  comparePagePath,
  resolveCompareContentTypeSlug,
} from "@/features/comparison/comparison-route-resolver";
import { findComparableTypeMeta } from "@/features/comparison/resolve-comparable-type";

export type CompareWorkspaceTypeConfig = {
  slug: string;
  routePrefix: string;
  apiSegment: string;
  labelPluralEn: string;
  labelPluralAr: string;
  maxItems: number;
  comparisonMode: ComparisonMode;
  listHref: string;
  compareFields: CompareFieldMeta[];
};

type Props = {
  locale: string;
  localePrefix: string;
  isAr: boolean;
  types: CompareWorkspaceTypeConfig[];
  labels: ComparisonPageLabels & {
    drawerTitle: string;
    browseTypes: string;
    sameTypeOnly: string;
    clearAll: string;
    clearBucket?: string;
    typeNotComparable: string;
  };
  /** Pre-select tab when opening /compare/[contentType] or ?type=slug */
  initialActiveSlug?: string;
};

function pickActiveSlug(
  slugs: string[],
  prev: string | null,
  initialActiveSlug?: string,
  queryType?: string | null
): string | null {
  if (slugs.length === 0) return null;
  const preferredRaw = queryType?.trim() || initialActiveSlug?.trim();
  const preferred = preferredRaw ? resolveCompareContentTypeSlug(preferredRaw) : null;
  if (preferred && slugs.includes(preferred)) return preferred;
  const resolvedPrev = prev ? resolveCompareContentTypeSlug(prev) : null;
  if (resolvedPrev && slugs.includes(resolvedPrev)) return resolvedPrev;
  return slugs[0] ?? null;
}

function dedupeCanonicalSlugs(slugs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const slug of slugs) {
    const canonical = resolveCompareContentTypeSlug(slug);
    if (!seen.has(canonical)) {
      seen.add(canonical);
      out.push(canonical);
    }
  }
  return out;
}

function readBucketSlugsFromStore(): string[] {
  if (typeof window === "undefined") return [];
  const store = getCompareStore();
  const summary = getCompareBucketsSummary();
  return dedupeCanonicalSlugs(
    summary
      .map((b) => b.contentTypeSlug)
      .filter((slug) => (store[slug]?.length ?? 0) > 0)
  );
}

function bucketIncludesType(bucketSlugs: string[], typeSlug: string): boolean {
  const canonical = resolveCompareContentTypeSlug(typeSlug);
  return bucketSlugs.some((b) => resolveCompareContentTypeSlug(b) === canonical);
}

export function CompareWorkspace({
  locale,
  localePrefix,
  isAr,
  types,
  labels,
  initialActiveSlug,
}: Props) {
  const searchParams = useSearchParams();
  const queryType = searchParams.get("type");

  const initialBuckets = readBucketSlugsFromStore();
  const [activeSlug, setActiveSlug] = useState<string | null>(() =>
    pickActiveSlug(initialBuckets, null, initialActiveSlug, queryType)
  );
  const [bucketSlugs, setBucketSlugs] = useState<string[]>(initialBuckets);

  const refreshBuckets = useCallback(() => {
    const slugs = readBucketSlugsFromStore();
    setBucketSlugs(slugs);
    setActiveSlug((prev) => pickActiveSlug(slugs, prev, initialActiveSlug, queryType));
  }, [initialActiveSlug, queryType]);

  useEffect(() => {
    refreshBuckets();
    window.addEventListener(COMPARE_CHANGED_EVENT, refreshBuckets);
    window.addEventListener("storage", refreshBuckets);
    return () => {
      window.removeEventListener(COMPARE_CHANGED_EVENT, refreshBuckets);
      window.removeEventListener("storage", refreshBuckets);
    };
  }, [refreshBuckets]);

  useEffect(() => {
    if (bucketSlugs.length === 0) return;
    setActiveSlug((prev) => pickActiveSlug(bucketSlugs, prev, initialActiveSlug, queryType));
  }, [initialActiveSlug, queryType, bucketSlugs]);

  const resolvedActiveSlug = activeSlug
    ? resolveCompareContentTypeSlug(activeSlug)
    : null;
  const activeConfig = resolvedActiveSlug
    ? findComparableTypeMeta(types, resolvedActiveSlug)
    : undefined;
  const hasBuckets = bucketSlugs.length > 0;
  const multiBucket = bucketSlugs.length > 1;

  const emptyBrowseTypes = types.filter((t) => !bucketIncludesType(bucketSlugs, t.slug));

  if (!hasBuckets) {
    return (
      <>
        <p className="cmp-empty-msg">{labels.empty}</p>
        {emptyBrowseTypes.length > 0 ? (
          <div className="mt-8">
            <p className="text-sm text-muted-foreground mb-4">{labels.browseTypes}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {emptyBrowseTypes.map((t) => {
                const title = isAr ? t.labelPluralAr : t.labelPluralEn;
                return (
                  <Link
                    key={t.slug}
                    href={comparePagePath(locale, t.slug)}
                    className="cmp-hub-card block rounded-xl border p-6 transition-shadow hover:shadow-md"
                  >
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {labels.sameTypeOnly} · {t.maxItems} max
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className="cmp-workspace-toolbar">
        {multiBucket ? (
          <>
            <p className="cmp-workspace-hint text-sm text-muted-foreground mb-2">
              {labels.sameTypeOnly}
            </p>
            <div className="cmp-type-tabs" role="tablist" aria-label={labels.drawerTitle}>
              {bucketSlugs.map((slug) => {
                const config = findComparableTypeMeta(types, slug);
                const count = getCompareStore()[slug]?.length ?? 0;
                const title = config
                  ? isAr
                    ? config.labelPluralAr
                    : config.labelPluralEn
                  : slug;
                const isActive = slug === activeSlug;
                return (
                  <button
                    key={slug}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`cmp-type-tabs__btn${isActive ? " is-active" : ""}`}
                    onClick={() => setActiveSlug(slug)}
                  >
                    {title}
                    <span className="cmp-type-tabs__badge">{count}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        <div className="cmp-workspace-actions">
          {activeSlug ? (
            <button
              type="button"
              className="cmp-cta cmp-cta--ghost"
              onClick={() => {
                clearCompareList(activeSlug);
                refreshBuckets();
              }}
            >
              {labels.clearBucket ?? labels.clearAll}
            </button>
          ) : null}
          {multiBucket ? (
            <button
              type="button"
              className="cmp-cta cmp-cta--ghost"
              onClick={() => {
                clearCompareList();
                refreshBuckets();
              }}
            >
              {labels.clearAll}
            </button>
          ) : null}
        </div>
      </div>

      {activeConfig ? (
        <div key={activeConfig.slug} className="cmp-workspace-panel cmp-animate-in">
          <ComparisonPage
            locale={locale}
            localePrefix={localePrefix}
            contentTypeSlug={activeConfig.slug}
            apiSegment={activeConfig.apiSegment}
            comparisonMode={activeConfig.comparisonMode}
            compareFields={activeConfig.compareFields}
            maxItems={activeConfig.maxItems}
            listHref={activeConfig.listHref}
            labels={labels}
          />
        </div>
      ) : resolvedActiveSlug && hasBuckets ? (
        <p className="cmp-empty-msg">{labels.typeNotComparable}</p>
      ) : null}
    </>
  );
}
