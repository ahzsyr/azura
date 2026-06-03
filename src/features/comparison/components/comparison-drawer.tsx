"use client";

import type { RefObject } from "react";
import type { ComparableTypeMeta } from "@/features/comparison/types";
import { useDialogA11y } from "@/features/comparison/hooks/use-dialog-a11y";
import { ComparisonDrawerBucket } from "@/features/comparison/components/comparison-drawer-bucket";

export type CompareDrawerBucket = {
  contentTypeSlug: string;
  itemIds: string[];
  count: number;
};

type Props = {
  id: string;
  open: boolean;
  onClose: () => void;
  locale: string;
  buckets: CompareDrawerBucket[];
  typeBySlug: Map<string, ComparableTypeMeta>;
  totalCount: number;
  labels: {
    drawerTitle: string;
    compareNow: string;
    clearAll: string;
    empty: string;
    remove: string;
    addMore: string;
    clearBucket: string;
    close: string;
  };
  onClearAll: () => void;
  onStoreChange: () => void;
};

export function ComparisonDrawer({
  id,
  open,
  onClose,
  locale,
  buckets,
  typeBySlug,
  totalCount,
  labels,
  onClearAll,
  onStoreChange,
}: Props) {
  const panelRef = useDialogA11y(open, onClose);

  if (!open) return null;

  return (
    <>
      <div
        className="cmp-drawer__backdrop is-open"
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        id={id}
        ref={panelRef as RefObject<HTMLElement>}
        className="cmp-drawer is-open"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cmp-drawer-title"
      >
        <header className="cmp-drawer__header">
          <h2 id="cmp-drawer-title" className="text-base font-semibold">
            {labels.drawerTitle}
          </h2>
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {totalCount} items selected
          </span>
          <button type="button" onClick={onClose} aria-label={labels.close}>
            ×
          </button>
        </header>

        <div className="cmp-drawer__body">
          {buckets.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.empty}</p>
          ) : (
            buckets.map((bucket) => (
              <ComparisonDrawerBucket
                key={bucket.contentTypeSlug}
                contentTypeSlug={bucket.contentTypeSlug}
                itemIds={bucket.itemIds}
                meta={typeBySlug.get(bucket.contentTypeSlug)}
                locale={locale}
                labels={{
                  compareNow: labels.compareNow,
                  remove: labels.remove,
                  addMore: labels.addMore,
                  clearBucket: labels.clearBucket,
                }}
                onClose={onClose}
                onStoreChange={onStoreChange}
              />
            ))
          )}
        </div>

        {buckets.length > 0 ? (
          <div className="cmp-drawer__actions">
            <button type="button" className="cmp-cta cmp-cta--ghost" onClick={onClearAll}>
              {labels.clearAll}
            </button>
          </div>
        ) : null}
      </aside>
    </>
  );
}
