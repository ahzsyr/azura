"use client";

import type { ReactNode } from "react";
import { SearchQueryProvider } from "@/capabilities/search/query/search-query-provider";

/**
 * TanStack Query for the root document. Nuqs lives once, in NuqsProvider.
 * A second NuqsAdapter on this shell syncs useSearchParams through
 * history.replaceState on every render and blanks the account page.
 */
export function SearchQueryShell({ children }: { children: ReactNode }) {
  return <SearchQueryProvider>{children}</SearchQueryProvider>;
}
