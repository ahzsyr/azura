"use client";

import { useCallback, useMemo } from "react";
import { useQueryStates, type Options } from "nuqs";
import type { ListingFilterState } from "./types";
import {
  fromListingFilterState,
  listingFilterParsers,
  listingFilterUrlKeys,
  toListingFilterState,
  type ListingFilterQueryValues,
} from "./url-state";

export type UseListingFilterUrlStateOptions = Pick<
  Options,
  "history" | "scroll" | "shallow" | "limitUrlUpdates" | "startTransition"
>;

/**
 * Catalog listing filter state synchronized with the URL via nuqs.
 * Preserves listing query key semantics (category[], var=type:option, etc.).
 */
export function useListingFilterUrlState(options?: UseListingFilterUrlStateOptions) {
  const [values, setValues] = useQueryStates(listingFilterParsers, {
    urlKeys: listingFilterUrlKeys,
    history: options?.history ?? "replace",
    scroll: options?.scroll ?? false,
    shallow: options?.shallow,
    limitUrlUpdates: options?.limitUrlUpdates,
    startTransition: options?.startTransition,
  });

  const state = useMemo(
    () => toListingFilterState(values as ListingFilterQueryValues),
    [values],
  );

  const setState = useCallback(
    (
      next: ListingFilterState | ((prev: ListingFilterState) => ListingFilterState),
      setOptions?: Options,
    ) => {
      const resolved = typeof next === "function" ? next(state) : next;
      return setValues(fromListingFilterState(resolved), setOptions);
    },
    [setValues, state],
  );

  return { state, setState, values, setValues };
}
