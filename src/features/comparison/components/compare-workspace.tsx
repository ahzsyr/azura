"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  COMPARE_CHANGED_EVENT,
  clearCompareList,
  getCompareBucketsSummary,
  getCompareStore,
} from "@/features/comparison/comparison-store";
import { ComparisonPage } from "@/features/comparison/components/comparison-page";
import type { ComparisonPageLabels } from "@/features/comparison/components/comparison-page";
import type { CompareFieldMeta, ComparisonMode } from "@/features/comparison/types";
import { comparePagePath } from "@/features/comparison/comparison-route-resolver";

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
  };
};

export function CompareWorkspace({ locale, localePrefix, isAr, types, labels }: Props) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [bucketSlugs, setBucketSlugs] = useState<string[]>([]);

  const typeBySlug = useMemo(() => new Map(types.map((t) => [t.slug, t])), [types]);

  const refreshBuckets = useCallback(() => {
    const store = getCompareStore();
    const summary = getCompareBucketsSummary();
    const slugs = summary
      .map((b) => b.contentTypeSlug)
      .filter((slug) => (store[slug]?.length ?? 0) > 0);
    setBucketSlugs(slugs);
    setActiveSlug((prev) => {
      if (prev && slugs.includes(prev)) return prev;
      return slugs[0] ?? null;
    });
  }, []);

  useEffect(() => {
    refreshBuckets();
    window.addEventListener(COMPARE_CHANGED_EVENT, refreshBuckets);
    window.addEventListener("storage", refreshBuckets);
    return () => {
      window.removeEventListener(COMPARE_CHANGED_EVENT, refreshBuckets);
      window.removeEventListener("storage", refreshBuckets);
    };
  }, [refreshBuckets]);

  const activeConfig = activeSlug ? typeBySlug.get(activeSlug) : undefined;
  const hasBuckets = bucketSlugs.length > 0;
  const multiBucket = bucketSlugs.length > 1;

  const emptyBrowseTypes = types.filter((t) => !bucketSlugs.includes(t.slug));

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
                    href={comparePagePath(locale, t.routePrefix)}
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
          <div className="cmp-type-tabs" role="tablist" aria-label={labels.drawerTitle}>
            {bucketSlugs.map((slug) => {
              const config = typeBySlug.get(slug);
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
      ) : null}
    </>
  );
}
