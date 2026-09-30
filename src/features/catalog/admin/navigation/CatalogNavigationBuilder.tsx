"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CatalogDrawer,
  CatalogEmptyState,
  CatalogPageHeader,
  CatalogSection,
  CatalogTabs,
  CatalogTabsPanel,
} from "@/features/catalog/admin/ui";
import type {
  CatalogNavigation,
  CatalogNavigationActionType,
  CatalogNavigationAppearance,
  CatalogNavigationItem,
  CatalogNavigationLayout,
  CatalogNavigationMode,
  CatalogNavigationResponsive,
  CatalogNavigationScopeType,
  CatalogNavigationSurface,
} from "@/features/catalog/navigation/types";
import {
  CATALOG_NAVIGATION_ACTION_TYPES,
  CATALOG_NAVIGATION_SURFACES,
  DEFAULT_CATALOG_NAVIGATION_SURFACES,
  inferCatalogNavigationActionType,
} from "@/features/catalog/navigation/types";
import {
  describeNavigationInheritance,
  emptyCatalogNavigation,
} from "@/features/catalog/navigation/resolve";
import { resolveNavItemIcon } from "@/features/catalog/navigation/fallback";
import { buildCatalogNavItemHref } from "@/features/catalog/navigation/item-href";
import {
  normalizeNavFilters,
  seedNavFiltersForAction,
  summarizeNavFilterLeaves,
} from "@/features/catalog/navigation/normalize-nav-filters";
import { emptyRuleGroup } from "@/features/categories/matching";
import { MatchingRulesEditor } from "@/features/categories/admin/MatchingRulesEditor";
import { useAdminFormState } from "@/hooks/use-admin-form";
import type { PageActions } from "@/stores/admin-ui-store";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { NavAppearancePanel } from "./NavAppearancePanel";
import { NavLayoutPanel } from "./NavLayoutPanel";
import { NavItemIconFields } from "./NavItemIconFields";
import type { CatalogNavigationBreakpointLayout } from "@/features/catalog/navigation/types";

const API: RequestInit = { credentials: "include" };

const SURFACE_LABELS: Record<CatalogNavigationSurface, string> = {
  products: "Products",
  productDetail: "Product Details",
  categories: "Categories",
  categoryDetail: "Category Details",
  brands: "Brands",
  brandDetail: "Brand Details",
};

const PAGE_SCOPE_OPTIONS: Array<{ id: CatalogNavigationSurface; label: string }> = [
  { id: "products", label: "Products" },
  { id: "productDetail", label: "Product Details" },
  { id: "categories", label: "Categories" },
  { id: "categoryDetail", label: "Category Details" },
  { id: "brands", label: "Brands" },
  { id: "brandDetail", label: "Brand Details" },
];

const MODES: CatalogNavigationMode[] = ["INHERIT", "EXTEND", "REPLACE"];

const ACTION_LABELS: Record<CatalogNavigationActionType, string> = {
  PAGE_LINK: "Page Link",
  CATEGORY_FILTER: "Category Filter",
  BRAND_FILTER: "Brand Filter",
  ATTRIBUTE_FILTER: "Attribute Filter",
  SPEC_FILTER: "Specification Filter",
  MULTI_FILTER: "Multiple Filters",
  SEARCH: "Search",
  CUSTOM_URL: "Custom URL",
};

type ConfigTab = "general" | "appearance" | "layout" | "advanced";
type ItemDrawerTab = "content" | "filter";

type CategoryOption = { slug: string; name: string };

function newItem(sortOrder: number): CatalogNavigationItem {
  return {
    id: `nav-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: "New item",
    targetType: "CATEGORY",
    sortOrder,
    visible: true,
    iconType: "lucide",
    icon: "layers",
    actionType: "PAGE_LINK",
    filters: emptyRuleGroup("all"),
  };
}

function normalizeGlobalDraft(nav: CatalogNavigation): CatalogNavigation {
  const withItems = {
    ...nav,
    items: normalizeNavItems(nav.items ?? []),
  };
  if (withItems.scopeType !== "GLOBAL") {
    return { ...withItems, appearance: withItems.appearance ?? { theme: "inherit" } };
  }
  return {
    ...withItems,
    enabled: withItems.enabled !== false,
    surfaces: { ...DEFAULT_CATALOG_NAVIGATION_SURFACES, ...(withItems.surfaces ?? {}) },
    appearance: withItems.appearance ?? { theme: "inherit" },
  };
}

function cloneNav(nav: CatalogNavigation): CatalogNavigation {
  return JSON.parse(JSON.stringify(nav)) as CatalogNavigation;
}

function destinationSummary(item: CatalogNavigationItem): string {
  const action = inferCatalogNavigationActionType(item);
  if (action === "SEARCH") {
    const q = item.searchQuery?.trim() ?? "";
    const exact = item.searchExact === true ? " exact" : "";
    return q ? `q=${q}${exact}` : "Search (no keyword)";
  }
  if (
    action === "CATEGORY_FILTER" ||
    action === "BRAND_FILTER" ||
    action === "ATTRIBUTE_FILTER" ||
    action === "SPEC_FILTER" ||
    action === "MULTI_FILTER"
  ) {
    const summary = summarizeNavFilterLeaves(normalizeNavFilters(item.filters));
    if (!summary) return `${ACTION_LABELS[action]} (no filters)`;
    return summary;
  }
  if (item.url) return item.url;
  if (item.targetId) return `${item.targetType}:${item.targetId}`;
  return item.targetType;
}

function normalizeNavItems(items: CatalogNavigationItem[]): CatalogNavigationItem[] {
  return items.map((item) => ({
    ...item,
    filters: item.filters != null ? normalizeNavFilters(item.filters) : item.filters,
    children: item.children ? normalizeNavItems(item.children) : item.children,
  }));
}

export function CatalogNavigationBuilder({
  initialScopeType = "GLOBAL",
  initialScopeId = null,
}: {
  initialScopeType?: CatalogNavigationScopeType;
  initialScopeId?: string | null;
}) {
  const [navigations, setNavigations] = useState<CatalogNavigation[]>([]);
  const [scopeType, setScopeType] = useState<CatalogNavigationScopeType>(initialScopeType);
  const [scopeId, setScopeId] = useState<string | null>(initialScopeId);
  const [draft, setDraft] = useState<CatalogNavigation>(() =>
    normalizeGlobalDraft(emptyCatalogNavigation(initialScopeType, initialScopeId)),
  );
  const savedDraftRef = useRef<CatalogNavigation>(cloneNav(draft));
  const [editItem, setEditItem] = useState<CatalogNavigationItem | null>(null);
  const [itemDrawerTab, setItemDrawerTab] = useState<ItemDrawerTab>("content");
  const [deleteTarget, setDeleteTarget] = useState<CatalogNavigationItem | null>(null);
  const [configTab, setConfigTab] = useState<ConfigTab>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [layoutBreakpoint, setLayoutBreakpoint] = useState<"base" | "desktop" | "tablet" | "mobile">(
    "base",
  );
  const skipDirtyRef = useRef(true);

  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const markPublishPending = useAdminUiStore((s) => s.markPublishPending);
  const markPublished = useAdminUiStore((s) => s.markPublished);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    skipDirtyRef.current = true;
    try {
      const [navRes, catRes] = await Promise.all([
        fetch("/api/catalog/navigation", API),
        fetch("/api/categories", API).catch(() => null),
      ]);
      const json = (await navRes.json()) as { navigations?: CatalogNavigation[]; error?: string };
      if (!navRes.ok) throw new Error(json.error ?? "Failed to load navigation");
      const list = json.navigations ?? [];
      setNavigations(list);
      const found = list.find(
        (n) => n.scopeType === scopeType && (n.scopeId ?? null) === (scopeId ?? null),
      );
      const next = normalizeGlobalDraft(found ?? emptyCatalogNavigation(scopeType, scopeId));
      setDraft(next);
      savedDraftRef.current = cloneNav(next);

      if (catRes?.ok) {
        const catJson = (await catRes.json()) as {
          categories?: Array<{ slug?: string; name?: string }>;
          collections?: Array<{ slug?: string; name?: string }>;
        };
        const rows = catJson.categories ?? catJson.collections ?? [];
        setCategories(
          rows
            .filter((c) => c.slug && c.name)
            .map((c) => ({ slug: String(c.slug), name: String(c.name) })),
        );
      }
      markSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      queueMicrotask(() => {
        skipDirtyRef.current = false;
      });
    }
  }, [scopeId, scopeType, markSaved]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedItems = useMemo(
    () => [...draft.items].sort((a, b) => a.sortOrder - b.sortOrder),
    [draft.items],
  );

  const inheritanceLabel = useMemo(
    () =>
      describeNavigationInheritance({
        scopeType,
        scopeId,
        surface: scopeType === "PAGE" ? (scopeId as CatalogNavigationSurface) : null,
      }),
    [scopeType, scopeId],
  );

  const selectScope = (type: CatalogNavigationScopeType, id: string | null) => {
    skipDirtyRef.current = true;
    setScopeType(type);
    setScopeId(id);
    setEditItem(null);
    const found = navigations.find(
      (n) => n.scopeType === type && (n.scopeId ?? null) === (id ?? null),
    );
    const next = normalizeGlobalDraft(found ?? emptyCatalogNavigation(type, id));
    setDraft(next);
    savedDraftRef.current = cloneNav(next);
    markSaved();
    queueMicrotask(() => {
      skipDirtyRef.current = false;
    });
  };

  const updateDraft = (patch: Partial<CatalogNavigation> | ((prev: CatalogNavigation) => CatalogNavigation)) => {
    setDraft((prev) => {
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      if (!skipDirtyRef.current) markUnsaved();
      return next;
    });
  };

  const updateItemInDraft = (id: string, patch: Partial<CatalogNavigationItem>) => {
    updateDraft((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
    setEditItem((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  };

  const moveItem = (id: string, dir: -1 | 1) => {
    const items = [...sortedItems];
    const idx = items.findIndex((i) => i.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= items.length) return;
    const tmp = items[idx]!;
    items[idx] = items[swap]!;
    items[swap] = tmp;
    updateDraft({ items: items.map((item, i) => ({ ...item, sortOrder: i })) });
  };

  const persistDraft = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setFeedback(null);
    setSaveStatus("saving");
    try {
      const payload: CatalogNavigation = {
        ...draft,
        scopeType,
        scopeId,
        items: sortedItems.map((item, i) => ({ ...item, sortOrder: i })),
      };
      if (scopeType === "GLOBAL") {
        payload.enabled = draft.enabled !== false;
        payload.surfaces = {
          ...DEFAULT_CATALOG_NAVIGATION_SURFACES,
          ...(draft.surfaces ?? {}),
        };
      }
      const res = await fetch("/api/catalog/navigation", {
        ...API,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ navigation: payload }),
      });
      const json = (await res.json()) as { navigation?: CatalogNavigation; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      if (json.navigation) {
        const next = normalizeGlobalDraft(json.navigation);
        skipDirtyRef.current = true;
        setDraft(next);
        savedDraftRef.current = cloneNav(next);
        setNavigations((prev) => {
          const key = `${next.scopeType}:${next.scopeId ?? ""}`;
          return [next, ...prev.filter((n) => `${n.scopeType}:${n.scopeId ?? ""}` !== key)];
        });
        queueMicrotask(() => {
          skipDirtyRef.current = false;
        });
      }
      markSaved();
      markPublishPending();
      setFeedback("Navigation saved.");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSaveStatus("error");
      return false;
    } finally {
      setSaving(false);
    }
  }, [
    draft,
    scopeType,
    scopeId,
    sortedItems,
    markSaved,
    markPublishPending,
    setSaveStatus,
  ]);

  const handleSave = useCallback(async () => persistDraft(), [persistDraft]);

  const handleCancel = useCallback(() => {
    skipDirtyRef.current = true;
    setDraft(cloneNav(savedDraftRef.current));
    setEditItem(null);
    setDeleteTarget(null);
    setError(null);
    setFeedback("Discarded unsaved changes.");
    markSaved();
    queueMicrotask(() => {
      skipDirtyRef.current = false;
    });
  }, [markSaved]);

  const handlePublish = useCallback(async () => {
    setError(null);
    setFeedback(null);
    const ok = await persistDraft();
    if (!ok) return false;
    markPublished();
    setFeedback("Navigation published to the live site.");
    return true;
  }, [persistDraft, markPublished]);

  const pageActions = useMemo((): PageActions => {
    return {
      onSave: () => handleSave(),
      onCancel: () => handleCancel(),
      onPublish: () => handlePublish(),
      saveLabel: "Save",
      cancelLabel: "Cancel",
      publishLabel: "Publish",
      saveTooltip: "Save catalog navigation for this scope",
      publishTooltip: "Save and publish navigation to the storefront",
      canSave: !saving && !loading,
      canCancel: !saving && !loading,
      canPublish: !saving && !loading,
      markSavedOnSaveSuccess: false,
      selfManagedSaveStatus: true,
    };
  }, [handleSave, handleCancel, handlePublish, saving, loading]);

  useAdminFormState(pageActions);

  const openEditItem = (item: CatalogNavigationItem, tab: ItemDrawerTab = "content") => {
    setEditItem({ ...item });
    setItemDrawerTab(tab);
  };

  const commitEditItem = () => {
    if (!editItem?.label.trim()) return;
    const exists = draft.items.some((i) => i.id === editItem.id);
    updateDraft({
      items: exists
        ? draft.items.map((i) => (i.id === editItem.id ? editItem : i))
        : [...draft.items, editItem],
    });
    setEditItem(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    updateDraft({ items: draft.items.filter((i) => i.id !== deleteTarget.id) });
    if (editItem?.id === deleteTarget.id) setEditItem(null);
    setDeleteTarget(null);
  };

  const appearance = draft.appearance ?? { theme: "inherit" };

  const patchAppearance = (patch: Partial<CatalogNavigationAppearance>) => {
    updateDraft({
      appearance: { ...(draft.appearance ?? { theme: "inherit" }), ...patch },
    });
  };

  const replaceAppearance = (appearance: CatalogNavigationAppearance) => {
    updateDraft({ appearance });
  };

  const layoutTarget =
    layoutBreakpoint === "base"
      ? draft.layout ?? {}
      : draft.responsive?.[layoutBreakpoint] ?? {};

  const patchLayout = (patch: Partial<CatalogNavigationBreakpointLayout>) => {
    if (layoutBreakpoint === "base") {
      updateDraft({ layout: { ...(draft.layout ?? {}), ...patch } });
    } else {
      const bp = layoutBreakpoint;
      const responsive: CatalogNavigationResponsive = {
        ...(draft.responsive ?? {}),
        [bp]: { ...(draft.responsive?.[bp] ?? {}), ...patch },
      };
      updateDraft({ responsive });
    }
  };

  const replaceLayout = (layout: CatalogNavigationBreakpointLayout) => {
    if (layoutBreakpoint === "base") {
      updateDraft({ layout });
    } else {
      const bp = layoutBreakpoint;
      const responsive: CatalogNavigationResponsive = {
        ...(draft.responsive ?? {}),
        [bp]: layout,
      };
      updateDraft({ responsive });
    }
  };

  const patchBaseLayout = (patch: Partial<CatalogNavigationLayout>) => {
    updateDraft({ layout: { ...(draft.layout ?? {}), ...patch } });
  };

  const generatedUrl = editItem
    ? buildCatalogNavItemHref({
        locale: "en-us",
        item: editItem,
        listingBasePath: "/en-us/products",
      })
    : "";

  const existingEntityScopes = useMemo(
    () => navigations.filter((n) => n.scopeType === "CATEGORY" || n.scopeType === "BRAND"),
    [navigations],
  );
  const existingPageScopes = useMemo(
    () => navigations.filter((n) => n.scopeType === "PAGE" && n.scopeId),
    [navigations],
  );

  return (
    <div className="space-y-4">
      <CatalogPageHeader
        title="Catalog Navigation"
        description="Page-specific, theme-aware product-filter navigation. Use the top bar to Save, Cancel, or Publish."
      />

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {feedback ? (
        <div className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-sm text-foreground">
          {feedback}
        </div>
      ) : null}

      <CatalogSection
        title="Navigation Scope"
        description="Choose what you are editing. Inheritance is shown below."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs">Scope type</Label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={
                scopeType === "GLOBAL"
                  ? "GLOBAL"
                  : scopeType === "PAGE"
                    ? `PAGE:${scopeId ?? "products"}`
                    : scopeType === "BRAND"
                      ? "BRAND"
                      : "CATEGORY"
              }
              onChange={(e) => {
                const v = e.target.value;
                if (v === "GLOBAL") selectScope("GLOBAL", null);
                else if (v === "BRAND")
                  selectScope("BRAND", scopeId && scopeType === "BRAND" ? scopeId : "");
                else if (v === "CATEGORY")
                  selectScope("CATEGORY", scopeId && scopeType === "CATEGORY" ? scopeId : "");
                else if (v.startsWith("PAGE:")) selectScope("PAGE", v.slice(5));
              }}
            >
              <option value="GLOBAL">Global</option>
              {PAGE_SCOPE_OPTIONS.map((p) => (
                <option key={p.id} value={`PAGE:${p.id}`}>
                  Page: {p.label}
                </option>
              ))}
              <option value="BRAND">Specific Brand</option>
              <option value="CATEGORY">Specific Category</option>
            </select>
          </div>

          {scopeType === "BRAND" || scopeType === "CATEGORY" ? (
            <div>
              <Label className="text-xs">{scopeType === "BRAND" ? "Brand slug" : "Category slug"}</Label>
              <Input
                className="mt-1"
                value={scopeId ?? ""}
                onChange={(e) => selectScope(scopeType, e.target.value.trim() || null)}
                placeholder={scopeType === "BRAND" ? "ubiquiti" : "wifi"}
                list={scopeType === "CATEGORY" ? "nav-category-slugs" : undefined}
              />
              {scopeType === "CATEGORY" ? (
                <datalist id="nav-category-slugs">
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </datalist>
              ) : null}
            </div>
          ) : null}

          {scopeType !== "GLOBAL" ? (
            <div>
              <Label className="text-xs">Mode</Label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={draft.mode}
                onChange={(e) =>
                  updateDraft({ mode: e.target.value as CatalogNavigationMode })
                }
              >
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="sm:col-span-2 lg:col-span-4">
            <p className="text-sm text-muted-foreground">
              Using: <span className="font-medium text-foreground">{inheritanceLabel}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={scopeType === "GLOBAL" ? "default" : "outline"}
                onClick={() => selectScope("GLOBAL", null)}
              >
                Global
              </Button>
              {existingPageScopes.map((n) => (
                <Button
                  key={`page-${n.scopeId}`}
                  type="button"
                  size="sm"
                  variant={scopeType === "PAGE" && scopeId === n.scopeId ? "default" : "outline"}
                  onClick={() => selectScope("PAGE", n.scopeId)}
                >
                  {SURFACE_LABELS[n.scopeId as CatalogNavigationSurface] ?? n.scopeId}
                </Button>
              ))}
              {existingEntityScopes.map((n) => (
                <Button
                  key={`${n.scopeType}-${n.scopeId}`}
                  type="button"
                  size="sm"
                  variant={
                    scopeType === n.scopeType && scopeId === n.scopeId ? "default" : "outline"
                  }
                  onClick={() => selectScope(n.scopeType, n.scopeId)}
                >
                  {n.scopeType}:{n.scopeId}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CatalogSection>

      {scopeType === "GLOBAL" ? (
        <CatalogSection
          title="Availability"
          description="Master gates for the storefront strip."
        >
          <label className="mb-3 flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4"
              checked={draft.enabled !== false}
              onChange={(e) => updateDraft({ enabled: e.target.checked })}
            />
            Enable Catalog Navigation
          </label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CATALOG_NAVIGATION_SURFACES.map((surface) => {
              const on = draft.surfaces?.[surface] !== false;
              return (
                <label key={surface} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={on}
                    disabled={draft.enabled === false}
                    onChange={(e) =>
                      updateDraft({
                        surfaces: {
                          ...DEFAULT_CATALOG_NAVIGATION_SURFACES,
                          ...(draft.surfaces ?? {}),
                          [surface]: e.target.checked,
                        },
                      })
                    }
                  />
                  {SURFACE_LABELS[surface]}
                </label>
              );
            })}
          </div>
        </CatalogSection>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)]">
        <CatalogSection
          title="Navigation Items"
          description="Reorder, enable/disable, edit, or delete items."
        >
          <div className="mb-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const item = newItem(sortedItems.length);
                openEditItem(item, "content");
              }}
            >
              + Add Item
            </Button>
          </div>
          {sortedItems.length === 0 ? (
            <CatalogEmptyState
              title="No navigation items"
              description="Add items for this scope, then Save from the top bar."
            />
          ) : (
            <ul className="space-y-2">
              {sortedItems.map((item, index) => {
                const icon = resolveNavItemIcon(item);
                return (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2.5 text-sm shadow-sm"
                  >
                    <span className="text-muted-foreground" aria-hidden>
                      ☰
                    </span>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/30">
                      {icon.iconType === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={icon.icon} alt="" className="size-5 object-contain" />
                      ) : (
                        <span className="text-[10px] uppercase text-muted-foreground">
                          {icon.icon.slice(0, 4)}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{item.label}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {destinationSummary(item)}
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs font-medium">
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={item.visible !== false}
                        onChange={(e) => updateItemInDraft(item.id, { visible: e.target.checked })}
                      />
                      {item.visible !== false ? "ON" : "OFF"}
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={index === 0}
                      onClick={() => moveItem(item.id, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={index === sortedItems.length - 1}
                      onClick={() => moveItem(item.id, 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEditItem(item)}
                    >
                      <Pencil className="mr-1 size-3.5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CatalogSection>

        <CatalogSection
          title="Configuration"
          description="Appearance, layout, and scope settings."
        >
          <CatalogTabs
            tabs={[
              { id: "general", label: "General" },
              { id: "appearance", label: "Appearance" },
              { id: "layout", label: "Layout" },
              { id: "advanced", label: "Advanced" },
            ]}
            activeTab={configTab}
            onTabChange={(id) => setConfigTab(id as ConfigTab)}
          />
          <CatalogTabsPanel className="mt-4 space-y-4">
            {configTab === "general" ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Configuration name</Label>
                  <Input
                    className="mt-1"
                    value={draft.name ?? ""}
                    onChange={(e) => updateDraft({ name: e.target.value })}
                    placeholder="e.g. Ubiquiti Navigation"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Scope: {scopeType}
                  {scopeId ? ` / ${scopeId}` : ""} · Mode: {draft.mode}
                </p>
                <p className="text-sm text-muted-foreground">Using: {inheritanceLabel}</p>
              </div>
            ) : null}

            {configTab === "appearance" ? (
              <NavAppearancePanel
                appearance={appearance}
                onPatchAppearance={patchAppearance}
                onReplaceAppearance={replaceAppearance}
                onPatchLayout={patchBaseLayout}
              />
            ) : null}

            {configTab === "layout" ? (
              <NavLayoutPanel
                breakpoint={layoutBreakpoint}
                onBreakpointChange={setLayoutBreakpoint}
                layout={layoutTarget}
                onPatchLayout={patchLayout}
                onReplaceLayout={replaceLayout}
              />
            ) : null}

            {configTab === "advanced" ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Internal id: <code className="text-foreground">{draft.id}</code>
                </p>
                <p>
                  Scope key:{" "}
                  <code className="text-foreground">
                    {scopeType}:{scopeId ?? ""}
                  </code>
                </p>
                <p>
                  Items: {sortedItems.length} · Visible:{" "}
                  {sortedItems.filter((i) => i.visible !== false).length}
                </p>
              </div>
            ) : null}
          </CatalogTabsPanel>
        </CatalogSection>
      </div>

      {/* Item edit drawer */}
      <CatalogDrawer
        open={!!editItem}
        onOpenChange={(open) => {
          if (!open) setEditItem(null);
        }}
        title={
          editItem && draft.items.some((i) => i.id === editItem.id)
            ? "Edit navigation item"
            : "Add navigation item"
        }
        description="Configure label, icon, destination, and filters."
        contentClassName="sm:max-w-2xl"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!editItem?.label.trim()}
              onClick={commitEditItem}
            >
              {editItem && draft.items.some((i) => i.id === editItem.id) ? "Apply" : "Add item"}
            </Button>
          </>
        }
      >
        {editItem ? (
          <div className="space-y-4">
            <div className="flex gap-1 border-b border-border/70 pb-px">
              {(
                [
                  ["content", "Content"],
                  ["filter", "Filter"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
                    itemDrawerTab === id
                      ? "bg-primary/[0.08] text-foreground"
                      : "text-muted-foreground hover:bg-muted/60"
                  }`}
                  onClick={() => setItemDrawerTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {itemDrawerTab === "content" ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Label</Label>
                  <Input
                    className="mt-1"
                    value={editItem.label}
                    onChange={(e) => setEditItem({ ...editItem, label: e.target.value })}
                  />
                </div>
                <NavItemIconFields
                  iconType={editItem.iconType === "image" ? "image" : "lucide"}
                  icon={editItem.icon ?? (editItem.iconType === "image" ? "" : "layers")}
                  onIconTypeChange={(type) =>
                    setEditItem({
                      ...editItem,
                      iconType: type,
                      icon:
                        type === "lucide"
                          ? editItem.iconType === "image"
                            ? "layers"
                            : editItem.icon || "layers"
                          : editItem.iconType === "image"
                            ? editItem.icon ?? ""
                            : "",
                    })
                  }
                  onIconChange={(icon) => setEditItem({ ...editItem, icon })}
                />
                <div>
                  <Label className="text-xs">Badge</Label>
                  <Input
                    className="mt-1"
                    value={editItem.badge ?? ""}
                    onChange={(e) => setEditItem({ ...editItem, badge: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Tooltip</Label>
                  <Input
                    className="mt-1"
                    value={editItem.tooltip ?? ""}
                    onChange={(e) => setEditItem({ ...editItem, tooltip: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editItem.visible !== false}
                    onChange={(e) => setEditItem({ ...editItem, visible: e.target.checked })}
                  />
                  Enabled on storefront
                </label>
              </div>
            ) : (
              <FilterEditor
                item={editItem}
                generatedUrl={generatedUrl}
                onChange={(patch) => setEditItem({ ...editItem, ...patch })}
              />
            )}
          </div>
        ) : null}
      </CatalogDrawer>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete navigation item?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Remove “${deleteTarget.label}” from this navigation. Save from the top bar to persist.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterEditor({
  item,
  generatedUrl,
  onChange,
}: {
  item: CatalogNavigationItem;
  generatedUrl: string;
  onChange: (patch: Partial<CatalogNavigationItem>) => void;
}) {
  const action = inferCatalogNavigationActionType(item);
  const filters = normalizeNavFilters(item.filters);

  const setAction = (actionType: CatalogNavigationActionType) => {
    const patch: Partial<CatalogNavigationItem> = { actionType };
    if (actionType === "CUSTOM_URL") {
      patch.targetType = "URL";
    } else if (actionType === "SEARCH") {
      patch.searchQuery = item.searchQuery?.trim() ? item.searchQuery : "";
    } else if (
      actionType === "CATEGORY_FILTER" ||
      actionType === "BRAND_FILTER" ||
      actionType === "SPEC_FILTER" ||
      actionType === "ATTRIBUTE_FILTER" ||
      actionType === "MULTI_FILTER"
    ) {
      patch.filters = seedNavFiltersForAction(actionType, filters);
    }
    onChange(patch);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Action</Label>
        <select
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          value={action}
          onChange={(e) => setAction(e.target.value as CatalogNavigationActionType)}
        >
          {CATALOG_NAVIGATION_ACTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACTION_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {action === "PAGE_LINK" ? (
        <>
          <div>
            <Label className="text-xs">Target type</Label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={item.targetType}
              onChange={(e) =>
                onChange({
                  targetType: e.target.value as CatalogNavigationItem["targetType"],
                })
              }
            >
              {(["CATEGORY", "BRAND", "PRODUCT", "PAGE", "URL"] as const).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Target id (slug)</Label>
            <Input
              className="mt-1"
              value={item.targetId ?? ""}
              onChange={(e) => onChange({ targetId: e.target.value })}
              list="nav-category-slugs"
            />
          </div>
          <div>
            <Label className="text-xs">URL override</Label>
            <Input
              className="mt-1"
              value={item.url ?? ""}
              onChange={(e) => onChange({ url: e.target.value })}
            />
          </div>
        </>
      ) : null}

      {action === "CUSTOM_URL" ? (
        <div>
          <Label className="text-xs">Custom URL</Label>
          <Input
            className="mt-1"
            value={item.url ?? ""}
            onChange={(e) => onChange({ url: e.target.value, targetType: "URL" })}
          />
        </div>
      ) : null}

      {action === "SEARCH" ? (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Search keyword</Label>
            <Input
              className="mt-1"
              value={item.searchQuery ?? ""}
              onChange={(e) => onChange({ searchQuery: e.target.value })}
              placeholder="switch"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Clicking this nav item opens the products listing with <code>?q=</code> set to this
              keyword.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={item.searchExact === true}
              onChange={(e) =>
                onChange({ searchExact: e.target.checked ? true : undefined })
              }
            />
            Exact phrase match
          </label>
          <p className="text-xs text-muted-foreground">
            When enabled, only products containing the full phrase (e.g. &ldquo;Door Access&rdquo;)
            match. Adds <code>?q_exact=1</code> to the generated URL.
          </p>
        </div>
      ) : null}

      {action !== "PAGE_LINK" && action !== "CUSTOM_URL" && action !== "SEARCH" ? (
        <div className="space-y-2">
          <MatchingRulesEditor
            value={filters}
            onChange={(next) => onChange({ filters: next })}
          />
        </div>
      ) : null}

      <div>
        <Label className="text-xs">Generated URL</Label>
        <code className="mt-1 block break-all rounded-md border bg-muted/40 px-3 py-2 text-xs">
          {generatedUrl || "—"}
        </code>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={item.openInNewTab === true}
          onChange={(e) => onChange({ openInNewTab: e.target.checked })}
        />
        Open in new tab
      </label>
    </div>
  );
}
