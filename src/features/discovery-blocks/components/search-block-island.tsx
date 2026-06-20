"use client";

import { useCallback } from "react";
import { safeAppRouterNavigate } from "@/lib/navigation/safe-app-router";
import { useRouter } from "@/i18n/navigation";
import { getDirection } from "@/i18n/routing";
import type { PublicSearchConfig } from "@/features/search/settings/public-search-config";
import { GlobalSearchPanel } from "@/features/search/components/global-search-panel";
import { SearchThemeRoot } from "@/features/search/components/search-ui/search-theme-root";
import { useGlobalSearch } from "@/features/search/hooks/use-global-search";
import type { SearchLocale } from "@/features/search/components/search-ui/search-copy";
import type { SearchEntityType } from "@prisma/client";
import { getLocalizedField, cn } from "@/lib/utils";
import { parseSearchBlockProps } from "@/features/discovery-blocks/lib/parse-block-props";
import { CatalogContentLayout } from "@/features/catalog/components/catalog-content-layout";

type Props = {
  locale: SearchLocale;
  config: PublicSearchConfig;
  blockProps: Record<string, unknown>;
};

export function SearchBlockIsland({ locale, config, blockProps: raw }: Props) {
  const p = parseSearchBlockProps(raw);
  const router = useRouter();
  const dir = getDirection(locale);

  const presetTypes =
    p.entityTypes.length > 0 ? (p.entityTypes as SearchEntityType[]) : undefined;

  const search = useGlobalSearch({
    apiBase: "/api/search",
    discoveryUrl: "/api/search/discovery",
    locale,
    config,
    active: true,
    entityTypePreset: presetTypes,
    panelMode: p.panelMode,
  });

  const placeholder =
    getLocalizedField(p, "placeholder", locale) || search.runtimeConfig.placeholder;

  const onNavigate = useCallback(
    (
      hit: {
        urlPath: string;
        adminPath?: string;
        title?: string;
        entityType?: SearchEntityType;
        entityId?: string;
        id?: string;
      },
      searchQ?: string
    ) => {
      search.recordNavigate(hit, searchQ);
      if (p.resultsMode === "redirect") {
        const q = (searchQ ?? search.query).trim();
        const path = q
          ? `${p.redirectPath}?q=${encodeURIComponent(q)}`
          : p.redirectPath;
        safeAppRouterNavigate(router, path);
        return;
      }
      const localized = hit.urlPath.replace(`/${locale}`, "") || "/";
      safeAppRouterNavigate(router, localized);
    },
    [search, p.resultsMode, p.redirectPath, locale, router]
  );

  const onApplyQuery = useCallback(
    (q: string) => {
      search.setQuery(q);
      if (p.resultsMode === "redirect" && q.trim()) {
        safeAppRouterNavigate(router, `${p.redirectPath}?q=${encodeURIComponent(q.trim())}`);
      }
    },
    [search, p.resultsMode, p.redirectPath, router]
  );

  if (!search.runtimeConfig.enabled || !search.runtimeConfig.globalSearchEnabled) {
    return null;
  }

  const layoutClass =
    p.layout === "hero"
      ? "max-w-2xl mx-auto"
      : p.layout === "compact"
        ? "max-w-md"
        : "w-full";

  return (
    <CatalogContentLayout
      dir={dir}
      className={cn("catalog-content-layout catalog-content-layout--search-block w-full", layoutClass)}
      mainClassName="catalog-content-layout__main w-full"
      contentClassName="catalog-content-layout__content w-full"
    >
      <SearchThemeRoot
        inheritGlobalTheme={search.runtimeConfig.inheritGlobalTheme}
        inputStyle={search.runtimeConfig.inputStyle}
        panelWidth={search.runtimeConfig.panelWidth}
        modalStyle={search.runtimeConfig.modal}
        className="w-full"
        dir={dir}
      >
        <GlobalSearchPanel
          mode={p.panelMode}
          locale={locale}
          query={search.query}
          onQueryChange={search.setQuery}
          loading={search.loading}
          runtimeConfig={{
            ...search.runtimeConfig,
            placeholder,
            showEntityTypeChips:
              p.panelMode === "discovery" &&
              p.showEntityTypeChips &&
              search.runtimeConfig.showEntityTypeChips,
            filters: p.panelMode === "discovery" && p.showFacetChips ? search.runtimeConfig.filters : [],
          }}
          ac={search.ac}
          minLen={search.minLen}
          results={search.results}
          suggestions={p.showPopular || p.showTrending ? search.suggestions : []}
          popular={p.showPopular ? search.popular : []}
          trending={p.showTrending ? search.trending : []}
          recentQueries={p.showRecentQueries ? search.recentQueries : []}
          historyEntries={p.showRecentQueries ? search.historyEntries : []}
          filterEntityTypes={search.filterEntityTypes}
          activeTypes={search.activeTypes}
          onToggleType={(type) =>
            search.setActiveTypes((prev) =>
              prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
            )
          }
          onClearTypes={() => search.setActiveTypes([])}
          entityLabel={search.entityLabel}
          enabledFilters={p.panelMode === "discovery" && p.showFacetChips ? search.enabledFilters : []}
          facetValueOptions={search.facetValueOptions}
          activeFacetFilters={search.activeFacetFilters}
          onToggleFacet={search.toggleFacetValue}
          discoveryContentTypes={search.discoveryContentTypes}
          showContentTypeChips={
            p.panelMode === "discovery" && search.showContentTypeChips && p.showEntityTypeChips
          }
          grouped={search.grouped}
          onNavigate={onNavigate}
          onApplyQuery={onApplyQuery}
          onClearAll={search.clearAllFilters}
          activeFilterCount={search.activeFilterCount}
          inputStyle={search.runtimeConfig.inputStyle}
          listboxId="discovery-search-block-listbox"
        />
      </SearchThemeRoot>
    </CatalogContentLayout>
  );
}
