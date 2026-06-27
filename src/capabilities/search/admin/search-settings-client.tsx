"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  saveAdminSearchSettings,
  rebuildSearchIndexFromSettings,
  type SearchSettingsPageData,
} from "@/capabilities/search/actions/search-settings.actions";
import {
  SEARCH_MODE_OPTIONS,
  SEARCH_SETTINGS_TABS,
  STANDARD_INDEX_FIELD_LABELS,
  type AdminSearchSettings,
  type SearchSettingsTabId,
} from "@/capabilities/search/settings/admin-search-settings.schema";
import {
  BUILTIN_CONTENT_TYPE_SOURCE_KEYS,
  SEARCH_SOURCE_BUILTIN_LABELS,
} from "@/capabilities/search/settings/search-sources";
import {
  SettingsSection,
  ToggleField,
  NumberField,
  TextField,
  SelectField,
} from "@/capabilities/search/admin/search-settings-fields";
import { SearchRankingPanel } from "@/capabilities/search/admin/search-ranking-panel";
import { SearchFiltersPanel } from "@/capabilities/search/admin/search-filters-panel";
import { SearchAnalyticsPanel } from "@/capabilities/search/admin/search-analytics-panel";
import { SearchTemplateGallery } from "@/capabilities/search/admin/search-template-gallery";
import { SearchPageDesignPanel } from "@/capabilities/search/admin/search-page-design-panel";
import { SearchModalElementsPanel } from "@/capabilities/search/admin/search-modal-elements-panel";
import { SearchDesignLivePreview } from "@/capabilities/search/admin/search-design-live-preview";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { publishShell, fetchSiteSettingsPublishStatus } from "@/lib/publish-shell.client";
import { ENTITY_LABELS } from "@/capabilities/search/constants";
import type { SearchEntityType } from "@prisma/client";

type Props = SearchSettingsPageData;

function isValidTab(id: string | null): id is SearchSettingsTabId {
  return SEARCH_SETTINGS_TABS.some((t) => t.id === id);
}

export function SearchSettingsAdminClient({
  settings: initial,
  locale,
  discovery,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = useMemo(
    () => (isValidTab(tabParam) ? tabParam : "general"),
    [tabParam]
  );

  const [settings, setSettings] = useState<AdminSearchSettings>(initial);
  const [savedSettings, setSavedSettings] = useState<AdminSearchSettings>(initial);
  const [indexStats, setIndexStats] = useState({
    documentCount: discovery.documentCount,
    documentsByEntityType: discovery.documentsByEntityType ?? {},
  });
  const [validateFeedback, setValidateFeedback] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const markPublishPending = useAdminUiStore((s) => s.markPublishPending);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);

  const patch = useCallback(<K extends keyof AdminSearchSettings>(key: K, value: AdminSearchSettings[K]) => {
    markUnsaved();
    setSettings((s) => ({ ...s, [key]: value }));
  }, [markUnsaved]);

  const patchNested = useCallback(
    <K extends keyof AdminSearchSettings, NK extends keyof AdminSearchSettings[K]>(
      key: K,
      nestedKey: NK,
      value: AdminSearchSettings[K][NK]
    ) => {
      markUnsaved();
      setSettings((s) => {
        const next = {
          ...s,
          [key]: { ...(s[key] as object), [nestedKey]: value },
        } as AdminSearchSettings;
        if (key === "general") {
          const g = next.general;
          next.enabled = g.enabled;
          next.autocomplete = {
            ...next.autocomplete,
            debounceMs: g.debounceMs,
            maxResults: g.maxResults,
          };
          next.ranking = { ...next.ranking, fullTextMinLength: g.minQueryLength };
        }
        if (key === "sources") {
          next.catalog = {
            ...next.catalog,
            products: next.sources.products,
            collections: next.sources.collections,
          };
        }
        return next;
      });
    },
    [markUnsaved]
  );

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.replace(`/admin/settings/search?${params.toString()}`, { scroll: false });
  };

  const save = useCallback(async () => {
    setError(null);
    setFeedback(null);
    setSaveStatus("saving");
    const result = await saveAdminSearchSettings(settings, locale);
    if (result.ok) {
      setSavedSettings(settings);
      setFeedback("Search settings saved.");
      markSaved();
      markPublishPending();
    } else {
      setError(result.error);
      setSaveStatus("error");
    }
  }, [settings, locale, markSaved, markPublishPending, setSaveStatus]);

  const publish = useCallback(async () => {
    setError(null);
    setFeedback(null);
    await publishShell("site-settings", locale);
    setFeedback("Search settings published to the live site.");
  }, [locale]);

  useEffect(() => {
    void (async () => {
      try {
        const status = await fetchSiteSettingsPublishStatus(locale);
        useAdminUiStore
          .getState()
          .setPublishStatus(status.isLive ? "live" : "pending");
      } catch {
        /* ignore */
      }
    })();
  }, [locale]);

  const handleCancel = useCallback(() => {
    setSettings(savedSettings);
    setError(null);
    setFeedback(null);
  }, [savedSettings]);

  const rebuild = useCallback(async () => {
    setError(null);
    setFeedback(null);
    setSaveStatus("saving");
    const result = await rebuildSearchIndexFromSettings();
    if (result.ok) {
      setIndexStats({
        documentCount: result.documents,
        documentsByEntityType: result.byEntityType,
      });
      const warn =
        result.warnings.length > 0 ? ` Warnings: ${result.warnings.join(" ")}` : "";
      setFeedback(`Search index rebuilt (${result.documents} documents).${warn}`);
      const settingsMatchSaved = JSON.stringify(settings) === JSON.stringify(savedSettings);
      if (settingsMatchSaved) {
        markSaved();
      } else {
        setSaveStatus("unsaved");
      }
    } else {
      setError(result.error);
      setSaveStatus("error");
    }
  }, [markSaved, setSaveStatus, settings, savedSettings]);

  useEffect(() => {
    registerPageActions({
      onSave: save,
      onPublish: publish,
      onCancel: handleCancel,
      onRebuildIndex: rebuild,
      rebuildIndexLabel: "Rebuild index",
      selfManagedSaveStatus: true,
    });
    return () => clearPageActions();
  }, [registerPageActions, clearPageActions, save, publish, handleCancel, rebuild]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Search"
        description="Configure global search, indexing sources, ranking, filters, and storefront appearance."
      />

      {feedback ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          {feedback}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Index status</CardTitle>
          <CardDescription>
            {indexStats.documentCount != null
              ? `${indexStats.documentCount} documents in SearchDocument · ${discovery.contentTypes.length} searchable content types`
              : "Run rebuild after changing sources or per-type index rules."}
          </CardDescription>
        </CardHeader>
        {indexStats.documentCount != null && Object.keys(indexStats.documentsByEntityType).length > 0 ? (
          <CardContent className="pt-0 space-y-3">
            <ul className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {(Object.entries(indexStats.documentsByEntityType) as [SearchEntityType, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <li
                    key={type}
                    className="rounded-md border bg-muted/40 px-2 py-1 font-medium"
                  >
                    {ENTITY_LABELS[type]?.en ?? type}: {count}
                  </li>
                ))}
            </ul>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={validating}
                onClick={() => {
                  setValidating(true);
                  setValidateFeedback(null);
                  void fetch("/api/catalog/validate?fix=1", { credentials: "include" })
                    .then((r) => r.json())
                    .then((j: {
                      search?: { staleCatalogDocs?: number; warnings?: { message: string }[] };
                      reconcile?: { removed?: number };
                    }) => {
                      const stale = j.search?.staleCatalogDocs ?? 0;
                      const removed = j.reconcile?.removed ?? 0;
                      const warn = j.search?.warnings?.[0]?.message;
                      setValidateFeedback(
                        removed > 0
                          ? `Removed ${removed} stale catalog search document(s).`
                          : stale > 0
                            ? warn ?? `${stale} stale catalog doc(s) remain.`
                            : "Catalog and search indexes look consistent.",
                      );
                    })
                    .catch((e) =>
                      setValidateFeedback(e instanceof Error ? e.message : "Validation failed"),
                    )
                    .finally(() => setValidating(false));
                }}
              >
                {validating ? "Validating…" : "Validate index"}
              </Button>
              {validateFeedback ? (
                <span className="text-xs text-muted-foreground">{validateFeedback}</span>
              ) : null}
            </div>
          </CardContent>
        ) : null}
      </Card>

      <AdminSettingsLayout
        tabs={SEARCH_SETTINGS_TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      >
        {(tab) => (
          <Card>
            <CardContent className="pt-6">
              {renderTab(tab, settings, patch, patchNested, discovery, setSettings, locale)}
            </CardContent>
          </Card>
        )}
      </AdminSettingsLayout>
    </div>
  );
}

function renderTab(
  tab: string,
  s: AdminSearchSettings,
  patch: <K extends keyof AdminSearchSettings>(key: K, value: AdminSearchSettings[K]) => void,
  patchNested: <K extends keyof AdminSearchSettings, NK extends keyof AdminSearchSettings[K]>(
    key: K,
    nestedKey: NK,
    value: AdminSearchSettings[K][NK]
  ) => void,
  discovery: Props["discovery"],
  setSettings: Dispatch<SetStateAction<AdminSearchSettings>>,
  locale: string
) {
  const patchContentTypeSlug = (slug: string, enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      sources: {
        ...prev.sources,
        contentTypeSlugs: { ...prev.sources.contentTypeSlugs, [slug]: enabled },
      },
    }));
  };

  const customContentTypes = discovery.allContentTypes.filter((t) => !t.isBuiltin);
  switch (tab as SearchSettingsTabId) {
    case "general":
      return (
        <div className="space-y-8">
          <SettingsSection
            title="General"
            description="Site-wide search switches, query behavior, and search mode."
          >
            <ToggleField
              label="Enable Search"
              description="Master switch. When off, search API returns no results and storefront search UI is hidden."
              checked={s.general.enabled}
              onChange={(v) => patchNested("general", "enabled", v)}
            />
            <ToggleField
              label="Enable Global Search"
              description="⌘K / Ctrl+K command palette and header search trigger."
              checked={s.general.globalSearchEnabled}
              onChange={(v) => patchNested("general", "globalSearchEnabled", v)}
            />
            <ToggleField
              label="Search Page"
              description={`Dedicated results page at ${s.general.searchPagePath}.`}
              checked={s.general.searchPageEnabled}
              onChange={(v) => patchNested("general", "searchPageEnabled", v)}
            />
            <TextField
              label="Search page path"
              description="Public URL path (locale prefix added automatically)."
              value={s.general.searchPagePath}
              onChange={(v) => patchNested("general", "searchPagePath", v.startsWith("/") ? v : `/${v}`)}
            />
          </SettingsSection>

          <SettingsSection
            title="Admin panel search"
            description="Separate from public storefront search (⌘K in admin uses admin paths and can include media)."
          >
            <ToggleField
              label="Include media in admin search"
              checked={s.adminSearch.includeMedia}
              onChange={(v) => patchNested("adminSearch", "includeMedia", v)}
            />
          </SettingsSection>

          <SettingsSection title="Query behavior" description="Limits and timing for search requests.">
            <NumberField
              label="Search results per page"
              description="Default page size for API search and the search results page."
              value={s.general.resultsPerPage}
              min={5}
              max={100}
              step={5}
              onChange={(v) => patchNested("general", "resultsPerPage", v)}
            />
            <NumberField
              label="Maximum results"
              description="Upper cap for autocomplete / command palette result lists."
              value={s.general.maxResults}
              min={8}
              max={80}
              onChange={(v) => patchNested("general", "maxResults", v)}
            />
            <NumberField
              label="Minimum query length"
              description="Characters required before search runs."
              value={s.general.minQueryLength}
              min={1}
              max={6}
              onChange={(v) => patchNested("general", "minQueryLength", v)}
            />
            <ToggleField
              label="Instant search"
              description="Fetch results as the user types. When off, press Enter to search."
              checked={s.general.instantSearch}
              onChange={(v) => patchNested("general", "instantSearch", v)}
            />
            <NumberField
              label="Debounce delay (ms)"
              description="Delay before instant search fires."
              value={s.general.debounceMs}
              min={0}
              max={800}
              step={10}
              onChange={(v) => patchNested("general", "debounceMs", v)}
            />
          </SettingsSection>

          <SettingsSection title="Search mode" description="How queries are executed against the index.">
            <SelectField
              label="Search mode"
              value={s.general.mode}
              onChange={(v) => patchNested("general", "mode", v as AdminSearchSettings["general"]["mode"])}
              options={SEARCH_MODE_OPTIONS.map((m) => ({
                value: m.value,
                label: m.label,
              }))}
            />
            <p className="text-sm text-muted-foreground">
              {SEARCH_MODE_OPTIONS.find((m) => m.value === s.general.mode)?.description}
            </p>
          </SettingsSection>

          <p className="text-xs text-muted-foreground">
            Per content type field indexing:{" "}
            <Link href="/admin/content/types" className="text-primary underline">
              Catalog → Content Types
            </Link>{" "}
            (<code className="text-xs">adminConfig.search</code>).
          </p>
        </div>
      );

    case "sources":
      return (
        <div className="space-y-8">
          <SettingsSection
            title="Catalog & platform"
            description="JSON product catalog and site-wide entity types."
          >
            <ToggleField
              label="Products"
              description="SKU catalog from the product index (CATALOG_PRODUCT)."
              checked={s.sources.products}
              onChange={(v) => patchNested("sources", "products", v)}
            />
            <ToggleField
              label="Collections"
              description="Product collections and catalog content collections."
              checked={s.sources.collections}
              onChange={(v) => patchNested("sources", "collections", v)}
            />
            <ToggleField
              label="Pages"
              description="CMS pages (PAGE entity)."
              checked={s.sources.pages}
              onChange={(v) => patchNested("sources", "pages", v)}
            />
            <ToggleField
              label="Posts"
              description="Blog posts."
              checked={s.sources.posts}
              onChange={(v) => patchNested("sources", "posts", v)}
            />
            <ToggleField
              label="Media"
              description="Media library (admin search; optional public)."
              checked={s.sources.media}
              onChange={(v) => patchNested("sources", "media", v)}
            />
          </SettingsSection>

          <SettingsSection
            title="Catalog content types"
            description="Built-in catalog item types. Requires search enabled on the content type (adminConfig.search)."
          >
            {BUILTIN_CONTENT_TYPE_SOURCE_KEYS.map((key) => {
              const typeRow = discovery.allContentTypes.find((t) => t.builtinKey === key);
              const missing = !typeRow;
              return (
                <ToggleField
                  key={key}
                  label={SEARCH_SOURCE_BUILTIN_LABELS[key]}
                  description={
                    missing
                      ? `No “${key}” content type in database yet.`
                      : typeRow.searchEnabled
                        ? `${typeRow.slug} (${typeRow.slug})`
                        : `Disabled in type settings — ${typeRow.slug}`
                  }
                  checked={s.sources[key]}
                  disabled={missing}
                  onChange={(v) => patchNested("sources", key, v)}
                />
              );
            })}
          </SettingsSection>

          <SettingsSection
            title="Custom content types"
            description="New types from Catalog → Content Types appear here automatically."
          >
            <ToggleField
              label="Enable custom content types"
              description="Default on for new types; override per type below."
              checked={s.sources.customContentTypes}
              onChange={(v) => patchNested("sources", "customContentTypes", v)}
            />
            <ul className="divide-y rounded-md border">
              {customContentTypes.length === 0 ? (
                <li className="px-3 py-4 text-sm text-muted-foreground">
                  No custom content types yet.{" "}
                  <Link href="/admin/content/types" className="text-primary underline">
                    Create one
                  </Link>
                  .
                </li>
              ) : (
                customContentTypes.map((t) => {
                  const explicit = s.sources.contentTypeSlugs[t.slug];
                  const checked =
                    explicit !== undefined ? explicit : s.sources.customContentTypes;
                  return (
                    <li
                      key={t.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm"
                    >
                      <div>
                        <span className="font-medium">{t.slug}</span>
                        <span className="ms-2 text-muted-foreground">({t.slug})</span>
                        {!t.searchEnabled ? (
                          <span className="ms-2 text-xs text-amber-600 dark:text-amber-400">
                            indexing off in type
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex cursor-pointer items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border"
                            checked={checked}
                            onChange={(e) => patchContentTypeSlug(t.slug, e.target.checked)}
                          />
                          Searchable
                        </label>
                        <Link
                          href={`/admin/content/types/${t.id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          Configure
                        </Link>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </SettingsSection>

          <SettingsSection
            title="Indexed now"
            description={`${discovery.contentTypes.length} type(s) active after site + per-type rules.`}
          >
            <ul className="divide-y rounded-md border">
              {discovery.contentTypes.length === 0 ? (
                <li className="px-3 py-4 text-sm text-muted-foreground">
                  No content types match current toggles and adminConfig.search.
                </li>
              ) : (
                discovery.contentTypes.map((t) => (
                  <li key={t.slug} className="px-3 py-2 text-sm">
                    <span className="font-medium">
                      {t.labelPlural.en ?? t.labelPlural.ar ?? Object.values(t.labelPlural)[0] ?? t.slug}
                    </span>
                    <span className="ms-2 text-muted-foreground">({t.slug})</span>
                  </li>
                ))
              )}
            </ul>
          </SettingsSection>

          <details className="rounded-md border px-3 py-2 text-sm">
            <summary className="cursor-pointer font-medium">Additional sources</summary>
            <div className="mt-3 space-y-3">
              <ToggleField
                label="FAQs"
                checked={s.sources.faqs}
                onChange={(v) => patchNested("sources", "faqs", v)}
              />
              <ToggleField
                label="Testimonials"
                checked={s.sources.testimonials}
                onChange={(v) => patchNested("sources", "testimonials", v)}
              />
              <ToggleField
                label="Content type landing pages"
                checked={s.sources.contentTypeLandings}
                onChange={(v) => patchNested("sources", "contentTypeLandings", v)}
              />
            </div>
          </details>

          <SettingsSection title="Standard index fields" description="Available per-type via field schema.">
            <div className="flex flex-wrap gap-2">
              {Object.entries(STANDARD_INDEX_FIELD_LABELS).map(([key, label]) => (
                <span
                  key={key}
                  className="rounded-full border bg-muted px-2.5 py-0.5 text-xs capitalize text-muted-foreground"
                >
                  {label}
                </span>
              ))}
            </div>
          </SettingsSection>
        </div>
      );

    case "ranking":
      return (
        <div className="space-y-8">
          <SettingsSection
            title="Signal weights & priority"
            description="Drag to set tie-break priority (top = highest). Higher weights amplify each signal when scoring results."
          >
            <SearchRankingPanel
              ranking={s.ranking}
              onPriorityOrderChange={(order) => patchNested("ranking", "priorityOrder", order)}
              onWeightChange={(signal, weight) =>
                setSettings((prev) => ({
                  ...prev,
                  ranking: {
                    ...prev.ranking,
                    weights: { ...prev.ranking.weights, [signal]: weight },
                  },
                }))
              }
            />
          </SettingsSection>

          <SettingsSection title="Query matching" description="Global search retrieval behavior.">
            <SelectField
              label="Fuzziness preset"
              description="Maps to Fuse threshold on listing pages; global search uses MySQL FULLTEXT + signal ranking."
              value={
                s.fuzziness === "strict" || s.fuzziness === "fuzzy" || s.fuzziness === "balanced"
                  ? s.fuzziness
                  : "balanced"
              }
              onChange={(v) => patch("fuzziness", v as AdminSearchSettings["fuzziness"])}
              options={[
                { value: "strict", label: "Strict" },
                { value: "balanced", label: "Balanced" },
                { value: "fuzzy", label: "Fuzzy" },
              ]}
            />
            <ToggleField
              label="Typo tolerance"
              description="Levenshtein-style penalty when matching titles."
              checked={s.ranking.enableTypoTolerance}
              onChange={(v) => patchNested("ranking", "enableTypoTolerance", v)}
            />
          </SettingsSection>
        </div>
      );

    case "filters":
      return (
        <div className="space-y-8">
          <SettingsSection
            title="Dynamic filters"
            description="Enable filters and drag to set display order. Custom fields are discovered from content type schemas (search.facet or filterable field types)."
          >
            <SearchFiltersPanel
              filters={s.filters}
              discoveredCustom={discovery.discoveredCustomFilters}
              onDisplayOrderChange={(order) => patchNested("filters", "displayOrder", order)}
              onShowEntityTypeChipsChange={(v) => patchNested("filters", "showEntityTypeChips", v)}
              onBuiltinEnabledChange={(id, enabled) =>
                setSettings((prev) => ({
                  ...prev,
                  filters: {
                    ...prev.filters,
                    builtin: { ...prev.filters.builtin, [id]: { enabled } },
                    ...(id === "contentType" ? { showContentTypeChips: enabled } : {}),
                  },
                }))
              }
              onCustomEnabledChange={(id, enabled) =>
                setSettings((prev) => {
                  const existing = prev.filters.customFields[id];
                  const discovered = discovery.discoveredCustomFilters.find((d) => d.id === id);
                  if (!existing && !discovered) return prev;
                  return {
                    ...prev,
                    filters: {
                      ...prev.filters,
                      customFields: {
                        ...prev.filters.customFields,
                        [id]: existing
                          ? { ...existing, enabled }
                          : {
                              enabled,
                              fieldKey: discovered!.fieldKey,
                              contentTypeSlug: discovered!.contentTypeSlug,
                              facetKey: discovered!.facetKey,
                              label: discovered!.label,
                              uiType: discovered!.uiType,
                            },
                      },
                    },
                  };
                })
              }
            />
          </SettingsSection>
          <p className="text-xs text-muted-foreground">
            Enable <code className="text-xs">search: {"{ facet: true } }"}</code> on content type
            fields to expose them as filters automatically.
          </p>
        </div>
      );

    case "autocomplete":
      return (
        <div className="space-y-6">
          <SettingsSection
            title="Instant suggestions"
            description="Command palette and search overlay behavior. Search debounce and max results live under General."
          >
            <ToggleField
              label="Instant suggestions"
              checked={s.autocomplete.instantSuggestions}
              onChange={(v) => patchNested("autocomplete", "instantSuggestions", v)}
            />
            <NumberField
              label="Suggest debounce (ms)"
              value={s.autocomplete.suggestDebounceMs}
              min={0}
              max={800}
              onChange={(v) => patchNested("autocomplete", "suggestDebounceMs", v)}
            />
            <NumberField
              label="Suggest min length"
              value={s.autocomplete.suggestMinLength}
              min={0}
              max={4}
              onChange={(v) => patchNested("autocomplete", "suggestMinLength", v)}
            />
            <ToggleField
              label="Show suggestions"
              checked={s.autocomplete.showSuggestions}
              onChange={(v) => patchNested("autocomplete", "showSuggestions", v)}
            />
            <NumberField
              label="Suggestion limit"
              value={s.autocomplete.suggestLimit}
              min={4}
              max={20}
              onChange={(v) => patchNested("autocomplete", "suggestLimit", v)}
            />
            <ToggleField
              label="Result previews (snippets)"
              checked={s.autocomplete.showResultPreviews}
              onChange={(v) => patchNested("autocomplete", "showResultPreviews", v)}
            />
            <ToggleField
              label="Group results by type"
              checked={s.autocomplete.groupResults}
              onChange={(v) => patchNested("autocomplete", "groupResults", v)}
            />
            <ToggleField
              label="Keyboard navigation hints"
              checked={s.autocomplete.keyboardNavigation}
              onChange={(v) => patchNested("autocomplete", "keyboardNavigation", v)}
            />
          </SettingsSection>
          <SettingsSection
            title="Recent, popular & trending"
            description="Empty-state and zero-query lists in the search overlay."
          >
            <ToggleField
              label="Recent searches"
              checked={s.autocomplete.showRecent}
              onChange={(v) => patchNested("autocomplete", "showRecent", v)}
            />
            <ToggleField
              label="Popular searches"
              checked={s.autocomplete.showPopular}
              onChange={(v) => patchNested("autocomplete", "showPopular", v)}
            />
            <ToggleField
              label="Trending searches"
              checked={s.autocomplete.showTrending}
              onChange={(v) => patchNested("autocomplete", "showTrending", v)}
            />
            <ToggleField
              label="Search history (local)"
              checked={s.autocomplete.showHistory}
              onChange={(v) => patchNested("autocomplete", "showHistory", v)}
            />
            <NumberField
              label="Recent / list limit"
              value={s.autocomplete.recentLimit}
              min={3}
              max={20}
              onChange={(v) => patchNested("autocomplete", "recentLimit", v)}
            />
            <NumberField
              label="History storage limit"
              value={s.autocomplete.historyLimit}
              min={10}
              max={200}
              onChange={(v) => patchNested("autocomplete", "historyLimit", v)}
            />
            <ToggleField
              label="Record queries for trending"
              checked={s.autocomplete.recordTrending}
              onChange={(v) => patchNested("autocomplete", "recordTrending", v)}
            />
            <TextField
              label="Popular queries"
              description="One query per line (shown when the search box is empty)."
              value={(s.autocomplete.popularQueries ?? []).join("\n")}
              onChange={(v) =>
                patchNested(
                  "autocomplete",
                  "popularQueries",
                  v
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter(Boolean)
                )
              }
              multiline
            />
            <TextField
              label="Trending override"
              description="Optional pinned trending queries (one per line). Live stats fill remaining slots when recording is enabled."
              value={(s.autocomplete.trendingQueries ?? []).join("\n")}
              onChange={(v) =>
                patchNested(
                  "autocomplete",
                  "trendingQueries",
                  v
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter(Boolean)
                )
              }
              multiline
            />
          </SettingsSection>
        </div>
      );

    case "smart":
      return (
        <div className="space-y-6">
          <SettingsSection
            title="Lexical matching"
            description="Fuzzy, partial, synonym, and multi-keyword behavior for global search and the search page."
          >
            <ToggleField
              label="Fuzzy matching"
              description="Rank results using edit-distance similarity when tokens are close but not exact."
              checked={s.smart.enableFuzzy}
              onChange={(v) => patchNested("smart", "enableFuzzy", v)}
            />
            <ToggleField
              label="Partial matching"
              description="Match prefixes and substrings, not only whole words."
              checked={s.smart.enablePartialMatch}
              onChange={(v) => patchNested("smart", "enablePartialMatch", v)}
            />
            <ToggleField
              label="Synonym expansion"
              description="Expand queries with built-in and custom synonym groups."
              checked={s.smart.enableSynonyms}
              onChange={(v) => patchNested("smart", "enableSynonyms", v)}
            />
            <ToggleField
              label="Multi-keyword search"
              checked={s.smart.enableMultiKeyword}
              onChange={(v) => patchNested("smart", "enableMultiKeyword", v)}
            />
            <SelectField
              label="Multi-keyword mode"
              description="ALL = every word must match; ANY = at least one word."
              value={s.smart.multiKeywordMode}
              onChange={(v) =>
                patchNested("smart", "multiKeywordMode", v as typeof s.smart.multiKeywordMode)
              }
              options={[
                { value: "any", label: "Any keyword (OR)" },
                { value: "all", label: "All keywords (AND)" },
              ]}
            />
            <NumberField
              label="Exact match boost"
              description="Extra score when the full query matches the title or body."
              value={s.smart.exactMatchBoost}
              min={0}
              max={30}
              onChange={(v) => patchNested("smart", "exactMatchBoost", v)}
            />
            <NumberField
              label="Typo max distance"
              description="Max Levenshtein distance per token (0–4). Stricter presets lower this automatically."
              value={s.smart.typoMaxDistance}
              min={0}
              max={4}
              onChange={(v) => patchNested("smart", "typoMaxDistance", v)}
            />
            <ToggleField
              label="Natural language parsing"
              description='Strip phrases like "find", "show me", "articles about" before searching.'
              checked={s.smart.naturalLanguageParsing}
              onChange={(v) => patchNested("smart", "naturalLanguageParsing", v)}
            />
          </SettingsSection>

          <SettingsSection
            title="Custom synonyms"
            description='One entry per line: token = synonym1, synonym2 (e.g. tour = package, trip).'
          >
            <TextField
              label="Synonym map"
              multiline
              value={Object.entries(s.smart.synonyms ?? {})
                .map(([k, vals]) => `${k} = ${(vals ?? []).join(", ")}`)
                .join("\n")}
              onChange={(raw) => {
                const map: Record<string, string[]> = {};
                for (const line of raw.split(/\r?\n/)) {
                  const trimmed = line.trim();
                  if (!trimmed || trimmed.startsWith("#")) continue;
                  const eq = trimmed.indexOf("=");
                  if (eq < 1) continue;
                  const key = trimmed.slice(0, eq).trim().toLowerCase();
                  const vals = trimmed
                    .slice(eq + 1)
                    .split(",")
                    .map((v) => v.trim().toLowerCase())
                    .filter(Boolean);
                  if (key && vals.length) map[key] = vals;
                }
                patchNested("smart", "synonyms", map);
              }}
            />
          </SettingsSection>

          <SettingsSection
            title="AI & semantic (optional)"
            description="Requires OPENAI_API_KEY for AI assist. Semantic re-rank activates when document embeddings are indexed."
          >
            <ToggleField
              label="Semantic search"
              checked={s.smart.semantic.enabled}
              onChange={(v) =>
                setSettings((prev) => ({
                  ...prev,
                  smart: { ...prev.smart, semantic: { ...prev.smart.semantic, enabled: v } },
                }))
              }
            />
            <SelectField
              label="Semantic provider"
              value={s.smart.semantic.provider}
              onChange={(v) =>
                setSettings((prev) => ({
                  ...prev,
                  smart: {
                    ...prev.smart,
                    semantic: {
                      ...prev.smart.semantic,
                      provider: v as typeof s.smart.semantic.provider,
                    },
                  },
                }))
              }
              options={[
                { value: "none", label: "None" },
                { value: "openai", label: "OpenAI (when API key set)" },
              ]}
            />
            <NumberField
              label="Semantic hybrid weight"
              value={Math.round((s.smart.semantic.hybridWeight ?? 0.2) * 100)}
              min={0}
              max={100}
              onChange={(v) =>
                setSettings((prev) => ({
                  ...prev,
                  smart: {
                    ...prev.smart,
                    semantic: { ...prev.smart.semantic, hybridWeight: v / 100 },
                  },
                }))
              }
            />
            <ToggleField
              label="AI-assisted query rewrite"
              description="Rewrite conversational queries to keywords via LLM before search."
              checked={s.smart.semantic.aiAssistEnabled}
              onChange={(v) =>
                setSettings((prev) => ({
                  ...prev,
                  smart: {
                    ...prev.smart,
                    semantic: { ...prev.smart.semantic, aiAssistEnabled: v },
                  },
                }))
              }
            />
            <TextField
              label="AI model"
              value={s.smart.semantic.model ?? "gpt-4o-mini"}
              onChange={(v) =>
                setSettings((prev) => ({
                  ...prev,
                  smart: {
                    ...prev.smart,
                    semantic: { ...prev.smart.semantic, model: v },
                  },
                }))
              }
            />
          </SettingsSection>
        </div>
      );

    case "appearance":
      return (
        <div className="space-y-8">
          <SettingsSection
            title="Templates"
            description="Apply a built-in layout preset for the search results page. You can fine-tune settings below after applying."
          >
            <SearchTemplateGallery
              page={s.appearance.page}
              onApply={(page) => patchNested("appearance", "page", page)}
            />
          </SettingsSection>

          <div className="grid gap-6 xl:grid-cols-[1fr_minmax(280px,360px)]">
            <div className="space-y-8">
              <SearchPageDesignPanel
                page={s.appearance.page}
                onChange={(page) => patchNested("appearance", "page", page)}
              />
            </div>
            <SearchDesignLivePreview appearance={s.appearance} />
          </div>

          <SettingsSection
            title="Global theme"
            description="Search inherits colors, presets, typography, radius, glass/blur, backgrounds, and motion from Admin → Theme."
          >
            <ToggleField
              label="Inherit global theme"
              description="When enabled, search UI uses site theme CSS variables (--az-preset-*, fonts, motion scale)."
              checked={s.appearance.inheritGlobalTheme}
              onChange={(v) => patchNested("appearance", "inheritGlobalTheme", v)}
            />
          </SettingsSection>

          <SettingsSection
            title="Search modal shell"
            description="Overlay dimming and panel opacity — fixes overly transparent modals on busy pages."
          >
            <SelectField
              label="Panel style"
              value={s.appearance.modal.panelStyle}
              onChange={(v) =>
                patchNested("appearance", "modal", {
                  ...s.appearance.modal,
                  panelStyle: v as typeof s.appearance.modal.panelStyle,
                  panelBlurPx: v === "glass" ? Math.max(s.appearance.modal.panelBlurPx, 8) : 0,
                })
              }
              options={[
                { value: "solid", label: "Solid (recommended)" },
                { value: "glass", label: "Glass / frosted" },
              ]}
            />
            <NumberField
              label="Overlay dim (%)"
              description="How dark the backdrop is. Higher = less homepage bleed-through."
              value={s.appearance.modal.overlayOpacity}
              min={30}
              max={95}
              onChange={(v) =>
                patchNested("appearance", "modal", { ...s.appearance.modal, overlayOpacity: v })
              }
            />
            <NumberField
              label="Overlay blur (px)"
              value={s.appearance.modal.overlayBlurPx}
              min={0}
              max={32}
              onChange={(v) =>
                patchNested("appearance", "modal", { ...s.appearance.modal, overlayBlurPx: v })
              }
            />
            <NumberField
              label="Panel opacity (%)"
              description="Surface opacity of the dialog. Use 95–100 for maximum readability."
              value={s.appearance.modal.panelOpacity}
              min={75}
              max={100}
              onChange={(v) =>
                patchNested("appearance", "modal", { ...s.appearance.modal, panelOpacity: v })
              }
            />
            <NumberField
              label="Panel blur (px)"
              description="Only applies when panel style is Glass."
              value={s.appearance.modal.panelBlurPx}
              min={0}
              max={32}
              onChange={(v) =>
                patchNested("appearance", "modal", { ...s.appearance.modal, panelBlurPx: v })
              }
            />
          </SettingsSection>

          <SearchModalElementsPanel
            modalElements={s.appearance.modalElements}
            onChange={(modalElements) => patchNested("appearance", "modalElements", modalElements)}
          />

          <SettingsSection title="Header trigger" description="Header search UI and placeholder copy.">
          <ToggleField
            label="Show in header"
            checked={s.appearance.showInHeader}
            onChange={(v) => patchNested("appearance", "showInHeader", v)}
          />
          <ToggleField
            label="Show on mobile"
            checked={s.appearance.showOnMobile}
            onChange={(v) => patchNested("appearance", "showOnMobile", v)}
          />
          <SelectField
            label="Header layout"
            value={s.appearance.publicHeaderLayout}
            onChange={(v) =>
              patchNested("appearance", "publicHeaderLayout", v as typeof s.appearance.publicHeaderLayout)
            }
            options={[
              { value: "inline", label: "Inline" },
              { value: "icon-floating", label: "Icon + overlay" },
              { value: "floating-header", label: "Floating header" },
            ]}
          />
          <SelectField
            label="Input style"
            value={s.appearance.inputStyle}
            onChange={(v) => patchNested("appearance", "inputStyle", v as typeof s.appearance.inputStyle)}
            options={[
              { value: "glass", label: "Glass" },
              { value: "solid", label: "Solid" },
              { value: "minimal", label: "Minimal" },
            ]}
          />
          <SelectField
            label="Panel width"
            value={s.appearance.panelWidth}
            onChange={(v) => patchNested("appearance", "panelWidth", v as typeof s.appearance.panelWidth)}
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
              { value: "xl", label: "Extra large" },
            ]}
          />
          <TextField
            label="Placeholder"
            value={s.appearance.placeholder}
            onChange={(v) => patchNested("appearance", "placeholder", v)}
          />
          <ToggleField
            label="Keyboard shortcut badge"
            checked={s.appearance.showShortcutBadge}
            onChange={(v) => patchNested("appearance", "showShortcutBadge", v)}
          />
          <SelectField
            label="Keyboard shortcut"
            value={s.appearance.keyboardShortcut}
            onChange={(v) =>
              patchNested("appearance", "keyboardShortcut", v as typeof s.appearance.keyboardShortcut)
            }
            options={[
              { value: "/", label: "/ (slash)" },
              { value: "none", label: "None" },
            ]}
          />
          </SettingsSection>
        </div>
      );

    case "analytics":
      return (
        <div className="space-y-8">
          <SettingsSection
            title="Recording"
            description="Persist search metrics to data/search-analytics for reports below."
          >
            <ToggleField
              label="Enable analytics"
              checked={s.analytics.enabled}
              onChange={(v) => patchNested("analytics", "enabled", v)}
            />
            <ToggleField
              label="Record result clicks & conversions"
              checked={s.analytics.recordClicks}
              onChange={(v) => patchNested("analytics", "recordClicks", v)}
            />
            <ToggleField
              label="Record filter usage"
              checked={s.analytics.recordFilters}
              onChange={(v) => patchNested("analytics", "recordFilters", v)}
            />
            <NumberField
              label="Retention (days)"
              value={s.analytics.retentionDays}
              min={7}
              max={365}
              onChange={(v) => patchNested("analytics", "retentionDays", v)}
            />
            <ToggleField
              label="Log queries to console"
              description="Development only — server console output."
              checked={s.analytics.logQueries}
              onChange={(v) => patchNested("analytics", "logQueries", v)}
            />
            <ToggleField
              label="Log zero-result queries to console"
              checked={s.analytics.logZeroResults}
              onChange={(v) => patchNested("analytics", "logZeroResults", v)}
            />
          </SettingsSection>
          <SearchAnalyticsPanel locale={locale} enabled={s.analytics.enabled} />
        </div>
      );

    case "performance":
      return (
        <div className="space-y-6">
          <SettingsSection
            title="Query execution"
            description="Retrieval limits and caching for large catalogs."
          >
            <ToggleField
              label="Query result cache"
              description="In-memory cache of recent identical searches (server process)."
              checked={s.performance.queryCacheEnabled}
              onChange={(v) => patchNested("performance", "queryCacheEnabled", v)}
            />
            <NumberField
              label="Cache TTL (seconds)"
              value={s.performance.queryCacheTtlSec}
              min={5}
              max={300}
              onChange={(v) => patchNested("performance", "queryCacheTtlSec", v)}
            />
            <NumberField
              label="Max retrieval candidates"
              description="Upper bound on rows scored per query (FULLTEXT + LIKE)."
              value={s.performance.maxRetrievalCandidates}
              min={20}
              max={120}
              onChange={(v) => patchNested("performance", "maxRetrievalCandidates", v)}
            />
            <ToggleField
              label="Skip LIKE when FULLTEXT succeeds"
              description="Reduces DB load when FULLTEXT returns hits (hybrid mode)."
              checked={s.performance.skipLikeWhenFullText}
              onChange={(v) => patchNested("performance", "skipLikeWhenFullText", v)}
            />
          </SettingsSection>
          <SettingsSection title="Indexing" description="Rebuild throughput and stored document size.">
            <ToggleField
              label="Sync catalog on product index build"
              description="Update SearchDocument when npm run catalog:index completes."
              checked={s.performance.syncCatalogOnProductIndex}
              onChange={(v) => patchNested("performance", "syncCatalogOnProductIndex", v)}
            />
            <NumberField
              label="Index body max characters"
              description="Truncate stored body text per document (FULLTEXT still indexes this cap)."
              value={s.performance.indexBodyMaxChars}
              min={2000}
              max={24000}
              onChange={(v) => patchNested("performance", "indexBodyMaxChars", v)}
            />
            <NumberField
              label="Parallel index workers"
              description="Concurrent items during full rebuild."
              value={s.performance.indexConcurrency}
              min={1}
              max={16}
              onChange={(v) => patchNested("performance", "indexConcurrency", v)}
            />
            <NumberField
              label="Media index limit"
              description="Cap on media assets indexed during rebuild."
              value={s.performance.mediaIndexLimit}
              min={0}
              max={5000}
              step={50}
              onChange={(v) => patchNested("performance", "mediaIndexLimit", v)}
            />
          </SettingsSection>
        </div>
      );

    default:
      return null;
  }
}
