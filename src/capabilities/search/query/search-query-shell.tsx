"use client";

import type { ReactNode } from "react";
import { SearchQueryProvider } from "@/capabilities/search/query/search-query-provider";

/** Root-level TanStack Query provider — no next-intl hooks. */
export function SearchQueryShell({ children }: { children: ReactNode }) {
  return <SearchQueryProvider>{children}</SearchQueryProvider>;
}
