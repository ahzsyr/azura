"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SEARCH_GC_TIMES } from "@/capabilities/search/query/search-stale-times";

function makeSearchQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        structuralSharing: true,
        refetchOnWindowFocus: false,
        retry: false,
        gcTime: SEARCH_GC_TIMES.search,
      },
    },
  });
}

let browserClient: QueryClient | undefined;

function getSearchQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    return makeSearchQueryClient();
  }
  if (!browserClient) browserClient = makeSearchQueryClient();
  return browserClient;
}

export function SearchQueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(getSearchQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export { getSearchQueryClient };
