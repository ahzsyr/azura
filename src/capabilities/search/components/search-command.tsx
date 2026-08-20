"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { useRouter as useNextRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { PublicSearchConfig } from "@/capabilities/search/settings/public-search-config";
import { resolvePublicAutocompleteConfig } from "@/capabilities/search/settings/search-autocomplete-config";
import {
  resolveSearchPageLayout,
  resolveSearchModalElements,
} from "@/capabilities/search/lib/search-page-layout";
import { GlobalSearchPanel } from "@/capabilities/search/components/global-search-panel";
import { SearchChrome } from "@/capabilities/search/components/search-ui/search-chrome";
import { SearchTriggerButton } from "@/capabilities/search/components/search-ui/search-trigger-button";
import { searchCopy, type SearchLocale } from "@/capabilities/search/components/search-ui/search-copy";
import { consumeSearchOpenPending } from "@/capabilities/search/components/search-open-bridge";
import { useSearchState } from "@/capabilities/search/hooks/use-search-state";

function GlobalSearchModal({
  apiBase,
  discoveryUrl,
  locale,
  config,
  adminMode,
  triggerClassName,
  showTrigger = true,
  onNavigate,
  inputStyle,
  panelWidth,
  inheritGlobalTheme,
}: {
  apiBase: string;
  discoveryUrl: string;
  locale: SearchLocale;
  config: PublicSearchConfig;
  adminMode?: boolean;
  triggerClassName?: string;
  showTrigger?: boolean;
  onNavigate: (path: string) => void;
  inputStyle?: PublicSearchConfig["inputStyle"];
  panelWidth?: PublicSearchConfig["panelWidth"];
  inheritGlobalTheme?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const t = searchCopy(locale);

  const search = useSearchState({
    apiBase,
    discoveryUrl,
    locale,
    config,
    adminMode,
    active: open,
    panelMode: "command",
    surface: "modal",
  });

  const resolvedInputStyle = inputStyle ?? search.runtimeConfig.inputStyle ?? "glass";
  const resolvedPanelWidth = panelWidth ?? search.runtimeConfig.panelWidth ?? "lg";
  const resolvedThemeInherit = inheritGlobalTheme ?? search.runtimeConfig.inheritGlobalTheme ?? true;
  const resolvedModal = search.runtimeConfig.modal;

  const openSearchModal = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setOpen(true);
  }, []);

  const closeSearchModal = useCallback(() => {
    setOpen(false);
    search.setQuery("");
  }, [search]);

  const navigateToSearchPage = useCallback(
    (q: string) => {
      closeSearchModal();
      onNavigate(search.buildSearchPageUrl(q));
    },
    [closeSearchModal, onNavigate, search]
  );

  const navigate = useCallback(
    (
      hit: {
        urlPath: string;
        adminPath?: string;
        title?: string;
        entityType?: import("@prisma/client").SearchEntityType;
        entityId?: string;
        id?: string;
      },
      searchQ?: string
    ) => {
      search.recordNavigate(hit, searchQ);
      closeSearchModal();
      const path = adminMode && hit.adminPath ? hit.adminPath : hit.urlPath;
      onNavigate(path);
    },
    [search, closeSearchModal, onNavigate, adminMode]
  );

  useEffect(() => {
    const onOpenRequest = () => openSearchModal();
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearchModal();
      }
    };
    document.addEventListener("sm:open-search", onOpenRequest);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("sm:open-search", onOpenRequest);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openSearchModal]);

  useEffect(() => {
    if (consumeSearchOpenPending()) {
      openSearchModal();
    }
  }, [openSearchModal]);

  if (!adminMode && search.discovery && (!search.runtimeConfig.enabled || !search.runtimeConfig.globalSearchEnabled)) {
    return null;
  }

  return (
    <>
      {showTrigger ? (
        <SearchTriggerButton
          label={t.search}
          onClick={() => openSearchModal()}
          className={triggerClassName}
        />
      ) : null}
      <SearchChrome
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : closeSearchModal())}
        title={t.search}
        panelWidth={resolvedPanelWidth}
        inputStyle={resolvedInputStyle}
        inheritGlobalTheme={resolvedThemeInherit}
        modalStyle={resolvedModal}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-0 sm:pt-0">
          <GlobalSearchPanel
            mode="command"
            locale={locale}
            query={search.query}
            onQueryChange={search.setQuery}
            onClose={closeSearchModal}
            loading={search.loading}
            error={search.error}
            runtimeConfig={search.runtimeConfig}
            ac={{ ...search.ac, groupResults: true }}
            minLen={search.minLen}
            results={search.results}
            suggestions={search.suggestions}
            popular={search.popular}
            trending={search.trending}
            recentQueries={search.recentQueries}
            historyEntries={search.historyEntries}
            filterEntityTypes={search.filterEntityTypes}
            activeTypes={search.activeTypes}
            onToggleType={search.toggleType}
            onClearTypes={() => search.setActiveTypes([])}
            entityLabel={search.entityLabel}
            enabledFilters={[]}
            facetValueOptions={new Map()}
            activeFacetFilters={{}}
            onToggleFacet={search.toggleFacetValue}
            discoveryContentTypes={search.discoveryContentTypes}
            showContentTypeChips={false}
            grouped={search.grouped}
            onNavigate={navigate}
            onApplyQuery={search.setQuery}
            relatedTerms={search.relatedTerms}
            onViewAllResults={navigateToSearchPage}
            totalResultCount={search.results.length}
            inputStyle={resolvedInputStyle}
          />
        </div>
      </SearchChrome>
    </>
  );
}

function usePublicSearchNavigation(locale: SearchLocale) {
  const router = useRouter();
  return useCallback(
    (path: string) => {
      const localized = path.replace(`/${locale}`, "") || "/";
      router.push(localized);
    },
    [locale, router]
  );
}

const DEFAULT_PUBLIC_CONFIG: PublicSearchConfig = {
  enabled: true,
  globalSearchEnabled: true,
  searchPageEnabled: false,
  searchPagePath: "/search",
  resultsPerPage: 20,
  instantSearch: true,
  debounceMs: 280,
  minQueryLength: 2,
  maxResults: 20,
  enterKeyAction: "search-page",
  mode: "hybrid",
  placeholder: "Search catalog, blog, pages…",
  inheritGlobalTheme: true,
  inputStyle: "glass",
  panelWidth: "lg",
  modal: {
    panelStyle: "solid",
    overlayOpacity: 78,
    overlayBlurPx: 16,
    panelOpacity: 98,
    panelBlurPx: 0,
  },
  filters: [],
  showEntityTypeChips: true,
  autocomplete: resolvePublicAutocompleteConfig({}),
  page: resolveSearchPageLayout(),
  modalElements: resolveSearchModalElements(),
};

/** Public storefront search — modal only; header supplies the trigger. */
export function SearchModalHost() {
  const locale = useLocale() as SearchLocale;
  const onNavigate = usePublicSearchNavigation(locale);
  return (
    <GlobalSearchModal
      apiBase="/api/search"
      discoveryUrl="/api/search/discovery"
      locale={locale}
      config={DEFAULT_PUBLIC_CONFIG}
      showTrigger={false}
      onNavigate={onNavigate}
    />
  );
}

/** @deprecated Prefer SearchModalHost for deferred/headerless mounts. */
export function SearchCommand() {
  return <SearchModalHost />;
}

export function AdminSearchCommand() {
  const router = useNextRouter();
  const onNavigate = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router]
  );
  return (
    <GlobalSearchModal
      apiBase="/api/admin/search"
      discoveryUrl="/api/admin/search/discovery"
      locale="en"
      config={{ ...DEFAULT_PUBLIC_CONFIG, enabled: true, globalSearchEnabled: true }}
      adminMode
      triggerClassName={cn("w-full justify-start rounded-lg")}
      onNavigate={onNavigate}
      inputStyle="solid"
      panelWidth="xl"
      inheritGlobalTheme={true}
    />
  );
}
