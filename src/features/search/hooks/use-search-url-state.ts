"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { safeAppRouterNavigate } from "@/lib/navigation/safe-app-router";
import type { SearchEntityType } from "@prisma/client";
import {
  parseFacetsParam,
  parseTypesParam,
} from "@/features/search/api/params-client";

export type SearchUrlState = {
  q: string;
  types: SearchEntityType[];
  facets: Record<string, string[]>;
};

export function useSearchUrlState(options?: {
  onStateChange?: (state: SearchUrlState) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onChangeRef = useRef(options?.onStateChange);
  onChangeRef.current = options?.onStateChange;

  const state = useMemo((): SearchUrlState => {
    const q = searchParams.get("q") ?? "";
    const types = parseTypesParam(searchParams.get("types")) ?? [];
    const facets = parseFacetsParam(searchParams.get("facets")) ?? {};
    return { q, types, facets };
  }, [searchParams]);

  useEffect(() => {
    onChangeRef.current?.(state);
  }, [state]);

  const writeUrl = useCallback(
    (next: Partial<SearchUrlState>, replace = false) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.q !== undefined) {
        if (next.q.trim()) params.set("q", next.q.trim());
        else params.delete("q");
      }
      if (next.types !== undefined) {
        if (next.types.length) params.set("types", next.types.join(","));
        else params.delete("types");
      }
      if (next.facets !== undefined) {
        const keys = Object.keys(next.facets);
        if (keys.length) {
          const payload: Record<string, string[]> = {};
          for (const [k, v] of Object.entries(next.facets)) {
            if (v.length) payload[k] = v;
          }
          if (Object.keys(payload).length) {
            params.set("facets", JSON.stringify(payload));
          } else {
            params.delete("facets");
          }
        } else {
          params.delete("facets");
        }
      }
      const qs = params.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      safeAppRouterNavigate(router, href, { replace });
    },
    [pathname, router, searchParams]
  );

  return { state, writeUrl };
}
