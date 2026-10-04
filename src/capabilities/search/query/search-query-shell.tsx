"use client";

import type { ReactNode } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { SearchQueryProvider } from "@/capabilities/search/query/search-query-provider";

/** Root-level nuqs + TanStack Query providers — no next-intl hooks. */
export function SearchQueryShell({ children }: { children: ReactNode }) {
  return (
    <NuqsAdapter>
      <SearchQueryProvider>{children}</SearchQueryProvider>
    </NuqsAdapter>
  );
}
