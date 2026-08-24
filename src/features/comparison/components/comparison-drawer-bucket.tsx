"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { CompareItemSnapshot, ComparableTypeMeta } from "@/features/comparison/types";
import {
  compareItemTitle,
  compareTypePluralLabel,
} from "@/features/comparison/lib/compare-locale";
import {
  clearCompareList,
  removeFromCompareList,
} from "@/features/comparison/comparison-store";
import { compareHubPath } from "@/features/comparison/comparison-route-resolver";

type Props = {
  contentTypeSlug: string;
  itemIds: string[];
  meta: ComparableTypeMeta | undefined;
  locale: string;
  totalBuckets: number;
  labels: {
    compareNow: string;
    remove: string;
    addMore: string;
    clearBucket: string;
  };
  onClose: () => void;
  onStoreChange: () => void;
};

export function ComparisonDrawerBucket({
  contentTypeSlug,
  itemIds,
  meta,
  locale,
  totalBuckets,
  labels,
  onClose,
  onStoreChange,
}: Props) {
  const [items, setItems] = useState<CompareItemSnapshot[]>([]);
  const [loading, setLoading] = useState(false);

  const label = compareTypePluralLabel(meta, locale, contentTypeSlug);

  const listPrefix = meta?.routePrefix ?? contentTypeSlug;
  const listHref = `/${locale}/${listPrefix}`;
  const apiSegment = contentTypeSlug;
  const compareHref =
    totalBuckets > 1
      ? compareHubPath(locale, contentTypeSlug)
      : `/${locale}/compare/${apiSegment}`;

  const loadItems = useCallback(async () => {
    if (itemIds.length === 0) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
        const params = new URLSearchParams({
          ids: itemIds.join(","),
          locale,
        });
        const res = await fetch(`/api/compare/${apiSegment}?${params}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as { items?: CompareItemSnapshot[] };
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [apiSegment, itemIds, locale]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const titleFor = (item: CompareItemSnapshot) => compareItemTitle(item, locale);

  return (
    <section className="cmp-drawer__bucket" aria-label={label}>
      <div className="cmp-drawer__bucket-head">
        <h3 className="cmp-drawer__bucket-title">
          {label} ({itemIds.length})
        </h3>
        <div className="cmp-drawer__bucket-actions">
          <Link href={compareHref} className="cmp-cta cmp-cta--sm" onClick={onClose}>
            {labels.compareNow}
          </Link>
          <Link href={listHref} className="cmp-cta cmp-cta--sm cmp-cta--outline" onClick={onClose}>
            {labels.addMore}
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="cmp-drawer__loading text-xs text-muted-foreground" aria-live="polite">
          …
        </p>
      ) : (
        <ul className="cmp-drawer__items" role="list">
          {items.map((item) => (
            <li key={item.id} className="cmp-drawer__item">
              <div className="cmp-drawer__item-media">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" width={48} height={48} decoding="async" />
                ) : (
                  <span className="cmp-drawer__item-placeholder" aria-hidden="true" />
                )}
              </div>
              <span className="cmp-drawer__item-title">{titleFor(item)}</span>
              <button
                type="button"
                className="cmp-drawer__item-remove"
                aria-label={`${labels.remove}: ${titleFor(item)}`}
                onClick={() => {
                  removeFromCompareList(contentTypeSlug, item.id);
                  onStoreChange();
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="cmp-drawer__clear-bucket text-xs text-muted-foreground hover:text-foreground"
        onClick={() => {
          clearCompareList(contentTypeSlug);
          onStoreChange();
        }}
      >
        {labels.clearBucket}
      </button>
    </section>
  );
}
