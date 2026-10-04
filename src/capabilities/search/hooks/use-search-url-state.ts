"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  createParser,
  useQueryStates,
  type Options,
} from "nuqs";
import type { SearchEntityType } from "@prisma/client";
import {
  parseFacetsParam,
  parseTypesParam,
} from "@/capabilities/search/api/params-client";

export type SearchUrlState = {
  q: string;
  types: SearchEntityType[];
  facets: Record<string, string[]>;
};

function facetsEqual(a: Record<string, string[]>, b: Record<string, string[]>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => {
    const av = a[key] ?? [];
    const bv = b[key] ?? [];
    if (av.length !== bv.length) return false;
    return av.every((value, index) => value === bv[index]);
  });
}

function typesEqual(a: SearchEntityType[], b: SearchEntityType[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

const parseAsSearchTypes = createParser({
  parse: (raw) => parseTypesParam(raw) ?? [],
  serialize: (types: SearchEntityType[]) => types.join(","),
  eq: typesEqual,
}).withDefault([] as SearchEntityType[]);

const parseAsSearchFacets = createParser({
  parse: (raw) => parseFacetsParam(raw) ?? {},
  serialize: (facets: Record<string, string[]>) => {
    const payload: Record<string, string[]> = {};
    for (const [key, values] of Object.entries(facets)) {
      if (values.length) payload[key] = values;
    }
    return JSON.stringify(payload);
  },
  eq: facetsEqual,
}).withDefault({} as Record<string, string[]>);

export const searchUrlParsers = {
  q: createParser({
    parse: (raw) => raw,
    serialize: (value: string) => value.trim(),
    eq: (a, b) => a.trim() === b.trim(),
  }).withDefault(""),
  types: parseAsSearchTypes,
  facets: parseAsSearchFacets,
};

export function useSearchUrlState(options?: {
  onStateChange?: (state: SearchUrlState) => void;
}) {
  const [values, setValues] = useQueryStates(searchUrlParsers, {
    history: "replace",
    scroll: false,
  });
  const onChangeRef = useRef(options?.onStateChange);
  onChangeRef.current = options?.onStateChange;

  const state = useMemo((): SearchUrlState => {
    return {
      q: values.q,
      types: values.types,
      facets: values.facets,
    };
  }, [values]);

  useEffect(() => {
    onChangeRef.current?.(state);
  }, [state]);

  const writeUrl = useCallback(
    (next: Partial<SearchUrlState>, replace = false) => {
      const patch: Partial<{
        q: string | null;
        types: SearchEntityType[] | null;
        facets: Record<string, string[]> | null;
      }> = {};

      if (next.q !== undefined) {
        const trimmed = next.q.trim();
        patch.q = trimmed ? trimmed : null;
      }
      if (next.types !== undefined) {
        patch.types = next.types.length ? next.types : null;
      }
      if (next.facets !== undefined) {
        const payload: Record<string, string[]> = {};
        for (const [key, values] of Object.entries(next.facets)) {
          if (values.length) payload[key] = values;
        }
        patch.facets = Object.keys(payload).length ? payload : null;
      }

      const setOptions: Options = {
        history: replace ? "replace" : "push",
        scroll: false,
      };
      void setValues(patch, setOptions);
    },
    [setValues],
  );

  return { state, writeUrl };
}
