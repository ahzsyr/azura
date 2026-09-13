"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { isSearchVirtualizationEnabled } from "@/capabilities/search/query/search-feature-flags";

const VIRTUALIZE_THRESHOLD = 100;

type Props<T> = {
  items: T[];
  estimateSize?: number;
  className?: string;
  renderItem: (item: T, index: number) => ReactNode;
  getKey: (item: T, index: number) => string;
};

export function SearchVirtualizedList<T>({
  items,
  estimateSize = 72,
  className,
  renderItem,
  getKey,
}: Props<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize =
    isSearchVirtualizationEnabled() && items.length >= VIRTUALIZE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 8,
    enabled: shouldVirtualize,
  });

  if (!shouldVirtualize) {
    return (
      <ul className={cn("space-y-2", className)} role="list">
        {items.map((item, index) => (
          <li key={getKey(item, index)}>{renderItem(item, index)}</li>
        ))}
      </ul>
    );
  }

  return (
    <div ref={parentRef} className={cn("max-h-[calc(100vh-10rem)] overflow-y-auto", className)}>
      <ul
        role="list"
        style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          return (
            <li
              key={getKey(item, virtualRow.index)}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="pb-2"
            >
              {renderItem(item, virtualRow.index)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
