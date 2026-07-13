"use client";

import { AddToCompareButton } from "@/features/comparison/components/add-to-compare-button";
import { cn } from "@/lib/utils";

export type CompareCardOverlayProps = {
  contentTypeSlug: string;
  itemId: string;
  maxItems: number;
  label?: string;
  className?: string;
};

export function CompareCardOverlay({
  contentTypeSlug,
  itemId,
  maxItems,
  label,
  className,
}: CompareCardOverlayProps) {
  return (
    <div className={cn("cmp-card-compare-slot", className)}>
      <AddToCompareButton
        contentTypeSlug={contentTypeSlug}
        itemId={itemId}
        maxItems={maxItems}
        label={label}
        variant="card"
      />
    </div>
  );
}
