"use client";

import { cn } from "@/lib/utils";

export function SearchResultSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  const widths = ["72%", "50%", "84%", "60%", "68%", "45%"];
  return (
    <div
      className={cn("space-y-3 px-3 py-2", className)}
      role="status"
      aria-busy="true"
      aria-label="Loading search results"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-transparent px-2 py-2.5">
          <div
            className="sm-search-shimmer h-4 rounded-md"
            style={{ width: widths[i % widths.length] }}
          />
          <div className="sm-search-shimmer h-3 w-2/5 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function SearchPageSkeleton() {
  return (
    <div className="mt-10 space-y-4" aria-busy="true" aria-label="Loading">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-border/60 bg-card/40 p-5 space-y-3"
        >
          <div className="sm-search-shimmer h-5 w-3/5 rounded-md" />
          <div className="sm-search-shimmer h-3 w-1/4 rounded-md" />
          <div className="sm-search-shimmer h-3 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}
