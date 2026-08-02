"use client";

import { AddToCompareButton } from "@/features/comparison/components/add-to-compare-button";

type Props = {
  contentTypeSlug: string;
  itemId: string;
  maxItems: number;
  label: string;
};

export function ContentDetailCompare({ contentTypeSlug, itemId, maxItems, label }: Props) {
  return (
    <div className="mt-4">
      <AddToCompareButton
        contentTypeSlug={contentTypeSlug}
        itemId={itemId}
        maxItems={maxItems}
        label={label}
        variant="inline"
        className="text-sm px-3 py-1.5"
      />
    </div>
  );
}
