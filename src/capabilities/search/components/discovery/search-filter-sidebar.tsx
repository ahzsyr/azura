"use client";

import type { SearchEntityType } from "@prisma/client";
import type { PublicSearchFilterDef } from "@/capabilities/search/settings/public-search-config";
import type { FacetAggregation } from "@/capabilities/search/engine/filter/search-facet-engine";
import { searchCopy, type SearchLocale } from "@/capabilities/search/components/search-ui/search-copy";
import { SearchFilterChips } from "@/capabilities/search/components/search-ui/search-filter-chips";
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
        <p
          className={cn(
            "text-[0.65rem] font-semibold uppercase tracking-wider",
            activeTypes.length > 0 ? "text-primary" : "text-muted-foreground"
          )}
        >
          {t.results}
          {activeTypes.length > 0 ? (
            <span className="ms-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] font-bold text-primary-foreground">
              {activeTypes.length}
            </span>
          ) : null}
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
        const activeValues = activeFacetFilters[agg.filterId] ?? [];
        const sectionActive = activeValues.length > 0;
        return (
          <div
            key={agg.facetKey}
            className={cn(
              "space-y-2 rounded-lg border px-2 py-2 transition-colors",
              sectionActive
                ? "border-primary/35 bg-primary/5"
                : "border-transparent"
            )}
          >
            <p
              className={cn(
                "px-1 text-[0.65rem] font-semibold uppercase tracking-wider",
                sectionActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {label}
              {sectionActive ? (
                <span className="ms-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] font-bold text-primary-foreground">
                  {activeValues.length}
                </span>
              ) : null}
            </p>
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {agg.values.map(({ value, count }) => {
                const active = activeValues.includes(value);
                return (
                  <li key={value}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        active
                          ? "border border-primary/30 bg-primary/10 font-medium text-foreground"
                          : "border border-transparent hover:bg-muted/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => onToggleFacet(agg.filterId, value)}
                        className={cn(
                          "rounded border-border",
                          active && "border-primary accent-primary"
                        )}
                      />
                      <span className="flex-1 truncate">{value}</span>
                      <span className={cn("text-xs", active ? "text-primary/80" : "text-muted-foreground")}>
                        {count}
                      </span>
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
