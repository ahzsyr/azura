"use client";

import type { SearchEntityType } from "@prisma/client";
import type { PublicSearchFilterDef } from "@/features/search/settings/public-search-config";
import type { FacetAggregation } from "@/features/search-framework/filter/search-facet-engine";
import { searchCopy, type SearchLocale } from "@/features/search/components/search-ui/search-copy";
import { SearchFilterChips } from "@/features/search/components/search-ui/search-filter-chips";
import { cn } from "@/lib/utils";

type Props = {
  locale: SearchLocale;
  filterEntityTypes: SearchEntityType[];
  activeTypes: SearchEntityType[];
  onToggleType: (type: SearchEntityType) => void;
  onClearTypes: () => void;
  entityLabel: (type: SearchEntityType) => string;
  enabledFilters: PublicSearchFilterDef[];
  facetAggregations: FacetAggregation[];
  activeFacetFilters: Record<string, string[]>;
  onToggleFacet: (filterId: string, value: string) => void;
  onClearAll: () => void;
  activeFilterCount: number;
  className?: string;
};

export function SearchFilterSidebar({
  locale,
  filterEntityTypes,
  activeTypes,
  onToggleType,
  onClearTypes,
  entityLabel,
  enabledFilters,
  facetAggregations,
  activeFacetFilters,
  onToggleFacet,
  onClearAll,
  activeFilterCount,
  className,
}: Props) {
  const t = searchCopy(locale);

  return (
    <aside
      className={cn(
        "w-full shrink-0 space-y-5 lg:sticky lg:top-36 lg:max-h-[calc(100vh-10rem)] lg:w-[280px] lg:self-start lg:overflow-y-auto lg:pr-2",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t.filters}</h2>
        {activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            {t.clearAllFilters}
          </button>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
          {t.results}
        </p>
        <SearchFilterChips
          chips={[
            { id: "all", label: t.all, active: activeTypes.length === 0, onClick: onClearTypes },
            ...filterEntityTypes.map((type) => ({
              id: type,
              label: entityLabel(type),
              active: activeTypes.includes(type),
              onClick: () => onToggleType(type),
            })),
          ]}
        />
      </div>

      {facetAggregations.map((agg) => {
        const filter = enabledFilters.find((f) => f.id === agg.filterId);
        const label =
          filter?.label ?? agg.facetKey;
        return (
          <div key={agg.facetKey} className="space-y-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {agg.values.map(({ value, count }) => {
                const active = (activeFacetFilters[agg.filterId] ?? []).includes(value);
                return (
                  <li key={value}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => onToggleFacet(agg.filterId, value)}
                        className="rounded border-border"
                      />
                      <span className="flex-1 truncate">{value}</span>
                      <span className="text-xs text-muted-foreground">{count}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </aside>
  );
}
