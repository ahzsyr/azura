"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { warmSearchCache } from "@/capabilities/search/query/warm-search-cache";
import { isSearchWarmCacheEnabled } from "@/capabilities/search/query/search-feature-flags";

/** Prefetches discovery on first load — must render inside NextIntlClientProvider. */
export function SearchWarmCacheHost() {
  const locale = useLocale();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isSearchWarmCacheEnabled()) return;
    warmSearchCache(queryClient, locale, "/api/search");
  }, [locale, queryClient]);

  return null;
}
