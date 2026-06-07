// @ts-nocheck — ported Astro admin panel; gradual strict typing in follow-ups.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./ProductManagerApp.css";
import type { ReactNode } from "react";
import { MediaPicker } from "@/features/catalog/admin/media/MediaPicker";
import type { MediaItem, MediaType } from "@/features/media/fs/types";
import type {
  Product,
  ProductAvailability,
  ProductStockStatus,
  ProductSummary,
} from "@/features/products/types";
import { buildFullProductExportDocument } from "@/features/products/lib/product-export-document";
import {
  getEmptyManagedProduct,
  normalizeProductForSave,
  slugify,
  type ManagedProduct,
} from "@/features/products/lib/product-manager-normalize";
import {
  DEFAULT_RESOLVED_PRODUCT_CTA,
  resolveProductCta,
  validateProductCtaExternalUrl,
  type ProductCtaCardLayout,
  type ProductCtaPartial,
  type ResolvedProductCtaConfig,
} from "@/features/products/lib/product-cta";
import { diffResolvedAppearance } from "@/features/products/lib/product-cta-appearance";
import { InternalLinkSelector } from "./InternalLinkSelector";
import { ProductCtaAppearanceFields } from "./ProductCtaAppearanceFields";
import { normalizeDetailedDescriptionInput } from "@/features/products/lib/product-detailed-description";
import type { CatalogIssue } from "@/features/products/lib/product-catalog-issues";
import { defaultLocale } from "@/features/catalog/admin/catalog-admin-config";
import { DataTable } from "@/features/catalog/admin/shared/DataTable";
import type { BulkAction, ColumnDef, FilterDef, InlineEditSave } from "@/features/catalog/admin/shared/types";
import { CtaLivePreview } from "./CtaLivePreview";
import { CtaIconUploadControls } from "./CtaIconUploadControls";
import {
  ADMIN_PRODUCT_TABS,
  type AdminProductTabId,
} from "@/features/catalog/admin/catalog-admin-tabs";
import { CatalogAdminShell } from "@/features/catalog/admin/catalog-admin-shell";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { Button } from "@/components/ui/button";
import { ProductBuyNowSettingsPanel } from "./ProductBuyNowSettingsPanel";
import { ProductQuoteCtaSettingsPanel } from "./ProductQuoteCtaSettingsPanel";
import { ProductPromoSettingsPanel } from "./ProductPromoSettingsPanel";
import { ProductTrustSettingsPanel } from "./ProductTrustSettingsPanel";
import { AdminSaveFeedback } from "./AdminSaveFeedback";
import { ProductPageAppearancePanel } from "./ProductPageAppearancePanel";
import { ProductPageElementsPanel } from "./ProductPageElementsPanel";
import { ProductPageDisplayFields } from "./ProductPageDisplayFields";
import { ProductCardAppearancePanel } from "./ProductCardAppearancePanel";
import {
  DEFAULT_RESOLVED_PRODUCT_BUY_NOW,
  type ResolvedProductBuyNow,
} from "@/features/products/lib/product-buy-now";
import type {
  ResolvedProductPageDisplay,
  ResolvedProductPageElementOrder,
  ResolvedProductPromo,
  ResolvedProductTrust,
} from "@/features/products/lib/product-page-display";
import { resolveProductPageDisplay, resolveProductPageElementOrder } from "@/features/products/lib/product-page-display";
import {
  saveProductBuyNowSettings,
  saveProductQuoteCtaSettings,
  saveProductPageElementsOnlySettings,
  saveProductPageLayoutOnlySettings,
  saveProductCardLayoutOnlySettings,
  saveProductPromoSettings,
  saveProductTrustSettings,
} from "./product-settings-save";
import { useAdminFormState } from "@/hooks/use-admin-form";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { ProductVariationsEditor } from "./ProductVariationsEditor";
import { ProductMediaSection } from "./media/ProductMediaSection";
import { ProductBulkImportModal, type BulkImportSummary, type CatalogLocaleOption } from "./ProductBulkImportModal";
import {
  resolveProductCardLayout,
  resolveProductPageLayout,
  type ResolvedProductCardLayout,
  type ResolvedProductPageLayout,
} from "@/features/products/lib/product-storefront-layout";
import {
  resolveProductPageCompactDisplay,
  type ResolvedProductPageCompactDisplay,
} from "@/features/products/lib/product-page-compact-display";

// ── Collection sync types ─────────────────────────────────────────────────────

interface CollectionMatch { slug: string; name: string; }
interface SyncWarning { code: string; message: string; context?: Record<string, unknown>; }
interface ProductSyncResult {
  productSlug: string;
  matchedCollections: CollectionMatch[];
  isOrphan: boolean;
  warnings: SyncWarning[];
}
interface SyncReport {
  generatedAt: string;
  locale: string;
  totalProducts: number;
  totalCollections: number;
  orphanProducts: number;
  ambiguousMatches: number;
  newCollectionsCreated: number;
  warnings: SyncWarning[];
  productStatuses: Array<{
    slug: string;
    name: string;
    matchedCollections: CollectionMatch[];
    isOrphan: boolean;
    hasAmbiguity: boolean;
  }>;
  collectionCounts: Record<string, number>;
}
interface ImportValidationEntry {
  slug: string;
  name: string;
  status: "ok" | "orphan" | "error";
  matchedCollections: CollectionMatch[];
  warnings: SyncWarning[];
}

const API: RequestInit = { credentials: "include" };

// ── Utilities ─────────────────────────────────────────────────────────────────

function readFileAsDataUrl(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function readControlledInputValue(e: { target: EventTarget | null }): string {
  const t = e.target;
  if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return t.value;
  return "";
}

function readControlledCheckboxChecked(e: { target: EventTarget | null }): boolean {
  return e.target instanceof HTMLInputElement && e.target.checked;
}

function objectPatch(row: unknown): Record<string, unknown> {
  if (row !== null && typeof row === "object" && !Array.isArray(row)) return { ...(row as Record<string, unknown>) };
  return {};
}

// ── Column definitions ────────────────────────────────────────────────────────

function makeProductColumns(
  storefrontPrefix: string,
  onEdit: (slug: string) => void,
  onDelete: (slug: string) => void,
): ColumnDef<ProductSummary>[] {
  return [
    {
      key: "primary_image",
      label: "Image",
      sortable: false,
      hideable: true,
      defaultVisible: true,
      width: "60px",
      render: (row) =>
        row.primary_image
          ? <img src={row.primary_image} alt={row.name} className="pm-thumb" style={{ width: 44, height: 34, objectFit: "cover", borderRadius: 6 }} />
          : <span style={{ color: "#9ca3af" }}>—</span>,
    },
    {
      key: "slug",
      label: "URL slug",
      sortable: true,
      hideable: true,
      defaultVisible: true,
      render: (row) => (
        <code className="pm-slug-cell" title="Storefront URL slug">
          {row.slug}
        </code>
      ),
    },
    {
      key: "name",
      label: "Name",
      sortable: true,
      hideable: false,
      defaultVisible: true,
      render: (row) => (
        <a
          href={`/${storefrontPrefix}/products/${encodeURIComponent(row.slug)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pm-row-link"
          style={{ fontWeight: 500 }}
          onClick={(e) => e.stopPropagation()}
        >
          {row.name}
        </a>
      ),
      renderEdit: (row, value, onChange) => (
        <input
          className="dt-inline-input"
          defaultValue={String(value ?? row.name)}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
      ),
    },
    {
      key: "mpn",
      label: "SKU",
      sortable: true,
      hideable: true,
      defaultVisible: true,
      render: (row) => <code style={{ fontSize: 11, color: "#6b7280" }}>{row.mpn || "—"}</code>,
      renderEdit: (row, value, onChange) => (
        <input className="dt-inline-input" defaultValue={String(value ?? row.mpn ?? "")} onChange={(e) => onChange(e.target.value)} autoFocus />
      ),
    },
    {
      key: "brand",
      label: "Brand",
      sortable: true,
      hideable: true,
      defaultVisible: true,
      render: (row) => <span>{row.brand || "—"}</span>,
      renderEdit: (_row, value, onChange) => (
        <input className="dt-inline-input" defaultValue={String(value ?? "")} onChange={(e) => onChange(e.target.value)} autoFocus />
      ),
    },
    {
      key: "category",
      label: "Category",
      sortable: true,
      hideable: true,
      defaultVisible: true,
      render: (row) => <span>{row.category || "—"}</span>,
      renderEdit: (_row, value, onChange) => (
        <input className="dt-inline-input" defaultValue={String(value ?? "")} onChange={(e) => onChange(e.target.value)} autoFocus />
      ),
    },
    {
      key: "price",
      label: "Price",
      sortable: true,
      hideable: true,
      defaultVisible: true,
      sortFn: (a, b) => a.price.value - b.price.value,
      render: (row) => (
        <span style={{ fontFamily: "var(--dt-mono, monospace)", fontSize: 12 }}>
          {row.price.currency} {row.price.value.toFixed(2)}
        </span>
      ),
      renderEdit: (row, value, onChange) => (
        <input
          className="dt-inline-input"
          type="number"
          step="0.01"
          defaultValue={String(value ?? row.price.value)}
          onChange={(e) => onChange(Number(e.target.value))}
          autoFocus
          style={{ maxWidth: 100 }}
        />
      ),
    },
    {
      key: "stock_status",
      label: "Stock",
      sortable: true,
      hideable: true,
      defaultVisible: true,
      render: (row) => {
        const s = row.stock_status || row.availability || "—";
        const color = s === "in_stock" || s === "InStock" ? "#166534" : s === "out_of_stock" || s === "OutOfStock" ? "#b91c1c" : "#92400e";
        return <span style={{ fontSize: 11, fontWeight: 600, color }}>{s}</span>;
      },
      renderEdit: (_row, value, onChange) => (
        <select className="dt-inline-select" defaultValue={String(value ?? "in_stock")} onChange={(e) => onChange(e.target.value)} autoFocus>
          <option value="in_stock">in_stock</option>
          <option value="out_of_stock">out_of_stock</option>
          <option value="preorder">preorder</option>
        </select>
      ),
    },
    {
      key: "rating",
      label: "Rating",
      sortable: true,
      hideable: true,
      defaultVisible: false,
      render: (row) => row.rating ? <span>★ {row.rating.toFixed(1)} ({row.reviews_count})</span> : <span style={{ color: "#9ca3af" }}>—</span>,
    },
    {
      key: "availability",
      label: "Availability",
      sortable: true,
      hideable: true,
      defaultVisible: false,
      render: (row) => <span>{row.availability || "—"}</span>,
    },
    {
      key: "_actions",
      label: "Actions",
      sortable: false,
      hideable: false,
      defaultVisible: true,
      width: "1%",
      render: (row) => (
        <span className="pm-actions">
          <button
            type="button"
            className="pm-btn-secondary pm-btn-icon"
            title="Edit full product"
            onClick={(e) => { e.stopPropagation(); onEdit(row.slug); }}
          >✏</button>
          <button
            type="button"
            className="pm-btn-danger pm-btn-icon"
            title="Delete product"
            onClick={(e) => { e.stopPropagation(); void onDelete(row.slug); }}
          >×</button>
        </span>
      ),
    },
  ];
}

// ── Filter definitions ────────────────────────────────────────────────────────

const PRODUCT_FILTERS: FilterDef<ProductSummary>[] = [
  {
    key: "brand",
    label: "Brand",
    type: "multi-select",
    field: "brand",
  },
  {
    key: "category",
    label: "Category",
    type: "multi-select",
    field: "category",
  },
  {
    key: "stock_status",
    label: "Stock",
    type: "select",
    field: "stock_status",
    options: [
      { value: "in_stock", label: "In Stock" },
      { value: "out_of_stock", label: "Out of Stock" },
      { value: "preorder", label: "Pre-order" },
    ],
  },
  {
    key: "availability",
    label: "Availability",
    type: "select",
    field: "availability",
    options: [
      { value: "InStock", label: "In Stock" },
      { value: "OutOfStock", label: "Out of Stock" },
      { value: "PreOrder", label: "Pre-order" },
      { value: "RequestQuote", label: "Request Quote" },
    ],
  },
  {
    key: "categories",
    label: "Categories",
    type: "multi-select",
    filter: (row, value) => {
      if (!value || (Array.isArray(value) && value.length === 0)) return true;
      const tags = (value as string[]).map((v) => v.toLowerCase());
      const rowCats = ((row as unknown as { categories?: string[] }).categories ?? []);
      return rowCats.some((c: string) => tags.includes(c.toLowerCase()));
    },
    getOptions: (data) => {
      const seen = new Set<string>();
      const opts: { value: string; label: string }[] = [];
      for (const row of data) {
        const cats = ((row as unknown as { categories?: string[] }).categories ?? []);
        for (const c of cats) {
          if (c && !seen.has(c)) { seen.add(c); opts.push({ value: c, label: c }); }
        }
      }
      return opts.sort((a, b) => a.label.localeCompare(b.label));
    },
  },
];


const SECTION_KEYS = [
  "basic", "media", "pricing", "variations", "page-display", "description",
  "specifications", "documents", "shipping", "related", "reviews", "cta", "seo",
] as const;

type SectionKey = (typeof SECTION_KEYS)[number];

const PRODUCT_EDIT_NAV: { id: SectionKey; label: string }[] = [
  { id: "basic", label: "Basic Info" },
  { id: "media", label: "Media" },
  { id: "pricing", label: "Pricing & Stock" },
  { id: "variations", label: "Variations" },
  { id: "page-display", label: "Page Display" },
  { id: "description", label: "Description" },
  { id: "specifications", label: "Specifications" },
  { id: "documents", label: "Documents" },
  { id: "shipping", label: "Shipping" },
  { id: "related", label: "Frequently Bought Together" },
  { id: "reviews", label: "Reviews" },
  { id: "cta", label: "Product CTA (overrides)" },
  { id: "seo", label: "SEO" },
];

type ViewMode = "list" | "edit";

type ProductManagerAppProps = {
  /** From `resolveTheme().productCta` — global storefront CTA defaults. */
  initialProductCta?: ResolvedProductCtaConfig;
  initialProductPageLayout?: ResolvedProductPageLayout;
  initialProductCardLayout?: ResolvedProductCardLayout;
  initialProductPageDisplay?: ResolvedProductPageDisplay;
  initialProductBuyNow?: ResolvedProductBuyNow;
  initialProductPagePromo?: ResolvedProductPromo;
  initialProductPageTrust?: ResolvedProductTrust;
  initialProductPageElementOrder?: ResolvedProductPageElementOrder;
  initialProductPageCompactDisplay?: ResolvedProductPageCompactDisplay;
  initialLocales?: CatalogLocaleOption[];
  /** BCP-47 code for admin catalog reads/writes (matches `adminLocale` in site config). */
  initialAdminLocaleCode?: string;
  initialCatalogBrands?: string[];
  initialCatalogTags?: string[];
};

// ── Main component ────────────────────────────────────────────────────────────

export default function ProductManagerApp({
  initialProductCta,
  initialProductPageLayout,
  initialProductCardLayout,
  initialProductPageDisplay,
  initialProductBuyNow,
  initialProductPagePromo,
  initialProductPageTrust,
  initialProductPageElementOrder,
  initialProductPageCompactDisplay,
  initialLocales,
  initialAdminLocaleCode = "en-us",
  initialCatalogBrands = [],
  initialCatalogTags = [],
}: ProductManagerAppProps) {
  const adminLocaleCode = initialAdminLocaleCode.toLowerCase();
  const catalogLocales = initialLocales?.length ? initialLocales : [{ code: "en-us", label: "English", urlPrefix: "en" }];
  const [view, setView] = useState<ViewMode>("list");
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [active, setActive] = useState<ManagedProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [relatedProductSlug, setRelatedProductSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [catalogIssues, setCatalogIssues] = useState<CatalogIssue[]>([]);
  const [catalogBannerDismissed, setCatalogBannerDismissed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncReport, setSyncReport] = useState<SyncReport | null>(null);
  const [importValidation, setImportValidation] = useState<ImportValidationEntry[] | null>(null);
  const [activeSyncResult, setActiveSyncResult] = useState<ProductSyncResult | null>(null);
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const syncPanelRef = useRef<HTMLDivElement | null>(null);

  const [globalCta, setGlobalCta] = useState<ResolvedProductCtaConfig>(() => {
    const src = initialProductCta ?? DEFAULT_RESOLVED_PRODUCT_CTA;
    const fb = DEFAULT_RESOLVED_PRODUCT_CTA;
    return {
      ...src,
      placements: { ...src.placements },
      cardLayout: src.cardLayout ?? fb.cardLayout,
      appearance: {
        page: { ...(src.appearance?.page ?? fb.appearance.page) },
        card: { ...(src.appearance?.card ?? fb.appearance.card) },
      },
      ...(src.internalLink ? { internalLink: { ...src.internalLink } } : {}),
    };
  });
  const [globalExternalHint, setGlobalExternalHint] = useState<string | null>(null);
  const [productExternalHint, setProductExternalHint] = useState<string | null>(null);

  const [adminTab, setAdminTab] = useState<AdminProductTabId>("table");
  const [pageLayout, setPageLayout] = useState<ResolvedProductPageLayout>(() => initialProductPageLayout ?? resolveProductPageLayout());
  const [cardLayout, setCardLayout] = useState<ResolvedProductCardLayout>(() => initialProductCardLayout ?? resolveProductCardLayout());
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const [layoutFeedback, setLayoutFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pageDisplay, setPageDisplay] = useState<ResolvedProductPageDisplay>(
    () => initialProductPageDisplay ?? resolveProductPageDisplay(),
  );
  const [globalBuyNow, setGlobalBuyNow] = useState<ResolvedProductBuyNow>(
    () => initialProductBuyNow ?? { ...DEFAULT_RESOLVED_PRODUCT_BUY_NOW, placements: { ...DEFAULT_RESOLVED_PRODUCT_BUY_NOW.placements } },
  );
  const [pagePromo, setPagePromo] = useState<ResolvedProductPromo>(
    () =>
      initialProductPagePromo ?? {
        enabled: true,
        eyebrow: "Events",
        title: "",
        subtitle: "",
        ctaLabel: "Learn more",
        ctaHref: "/about",
        openInNewTab: false,
      },
  );
  const [pageTrust, setPageTrust] = useState<ResolvedProductTrust>(
    () =>
      initialProductPageTrust ?? {
        enabled: true,
        provider: "Trustpilot",
        label: "Excellent",
        rating: 4.6,
        reviewCount: 0,
        href: "",
      },
  );
  const [elementOrder, setElementOrder] = useState<ResolvedProductPageElementOrder>(() =>
    initialProductPageElementOrder ?? resolveProductPageElementOrder(),
  );
  const [pageCompactDisplay, setPageCompactDisplay] = useState<ResolvedProductPageCompactDisplay>(() =>
    initialProductPageCompactDisplay ?? resolveProductPageCompactDisplay(),
  );

  const saveCurrentSettingsTab = useCallback(async () => {
    setLayoutFeedback(null);
    const ok =
      "Settings saved. Refresh the storefront (or restart dev) to pick up site.json changes.";
    try {
      switch (adminTab) {
        case "buy-now":
          await saveProductBuyNowSettings(adminLocaleCode, globalBuyNow);
          setLayoutFeedback({ kind: "ok", text: ok });
          break;
        case "quote-cta":
          await saveProductQuoteCtaSettings(adminLocaleCode, globalCta);
          setLayoutFeedback({ kind: "ok", text: ok });
          break;
        case "page-elements":
          await saveProductPageElementsOnlySettings(adminLocaleCode, {
            pageDisplay,
            elementOrder,
            compactDisplay: pageCompactDisplay,
          });
          setLayoutFeedback({ kind: "ok", text: "Page element settings saved." });
          break;
        case "page-layout":
          await saveProductPageLayoutOnlySettings(adminLocaleCode, pageLayout);
          setLayoutFeedback({ kind: "ok", text: ok });
          break;
        case "card-appearance":
          await saveProductCardLayoutOnlySettings(adminLocaleCode, cardLayout);
          setLayoutFeedback({ kind: "ok", text: ok });
          break;
        case "promo-banner":
          await saveProductPromoSettings(adminLocaleCode, pagePromo);
          setLayoutFeedback({ kind: "ok", text: ok });
          break;
        case "trust-widget":
          await saveProductTrustSettings(adminLocaleCode, pageTrust);
          setLayoutFeedback({ kind: "ok", text: ok });
          break;
        default:
          return;
      }
    } catch (e) {
      setLayoutFeedback({ kind: "err", text: e instanceof Error ? e.message : "Save failed" });
      throw e;
    }
  }, [
    adminTab,
    adminLocaleCode,
    globalBuyNow,
    globalCta,
    pageDisplay,
    elementOrder,
    pageCompactDisplay,
    pageLayout,
    cardLayout,
    pagePromo,
    pageTrust,
  ]);

  useAdminFormState(
    view === "list" && adminTab !== "table" ? { onSave: saveCurrentSettingsTab } : undefined,
  );

  // ── Media Picker state ────────────────────────────────────────────────────
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerAccept, setPickerAccept] = useState<MediaType[] | undefined>(undefined);
  const pickerCallbackRef = useRef<((item: MediaItem) => void) | null>(null);

  function openMediaPicker(accept: MediaType[] | undefined, onSelect: (item: MediaItem) => void) {
    setPickerAccept(accept);
    pickerCallbackRef.current = onSelect;
    setPickerOpen(true);
  }

  const [editSection, setEditSection] = useState<SectionKey>("basic");

  const effectiveProductCta = useMemo(
    () => (active ? resolveProductCta(globalCta, active.product_cta) : null),
    [active, globalCta],
  );

  const tableEmptyMessage = useMemo(
    () =>
      !loading && products.length === 0
        ? "No products in this locale yet. Create one with New Product or import a JSON bundle."
        : "No products match the current search or filters. Clear filters or widen your query.",
    [loading, products.length],
  );

  const catalogIssueSlugSet = useMemo(() => new Set(catalogIssues.map((i) => i.slug)), [catalogIssues]);

  function mergeCatalogIssues(a: CatalogIssue[], b: CatalogIssue[]): CatalogIssue[] {
    const key = (i: CatalogIssue) => `${i.kind}|${i.slug}|${i.message}|${i.filePath ?? ""}`;
    const map = new Map<string, CatalogIssue>();
    for (const i of [...a, ...b]) {
      map.set(key(i), i);
    }
    return [...map.values()];
  }

  useEffect(() => {
    setLayoutFeedback(null);
  }, [adminTab]);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products?locale=${encodeURIComponent(adminLocaleCode)}`, API);
      const json = (await res.json()) as {
        products?: ProductSummary[];
        catalogIssues?: CatalogIssue[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Failed loading products");
      setProducts(json.products ?? []);
      setCatalogIssues(Array.isArray(json.catalogIssues) ? json.catalogIssues : []);
      setCatalogBannerDismissed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed loading products");
    } finally {
      setLoading(false);
    }
  }, [adminLocaleCode]);

  const handleBulkImportDone = useCallback(async (summary: BulkImportSummary, dryRun: boolean) => {
    if (!dryRun) {
      await loadProducts();
    }
    if (dryRun) return;
    const entries: ImportValidationEntry[] = summary.rows
      .filter((r) => r.status === "ok" && r.collectionSync)
      .map((r) => ({
        slug: r.slug,
        name: r.slug,
        status: r.collectionSync!.isOrphan ? "orphan" : "ok",
        matchedCollections: r.collectionSync!.matchedCollections,
        warnings: (r.collectionSync!.warnings ?? []) as SyncWarning[],
      }));
    if (entries.length) {
      setImportValidation(entries);
      setShowSyncPanel(true);
    }
  }, []);

  useEffect(() => { void loadProducts(); }, [adminLocaleCode]);

  // ── Sync ──────────────────────────────────────────────────────────────────

  async function runCollectionSync(autoCreate = false) {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/sync-collections", {
        ...API,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: adminLocaleCode, autoCreate }),
      });
      const json = (await res.json()) as { report?: SyncReport; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Sync failed");
      setSyncReport(json.report ?? null);
      setShowSyncPanel(true);
      if (json.report?.newCollectionsCreated) await loadProducts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  // ── Export / Import ───────────────────────────────────────────────────────

  async function exportAllProductsJson() {
    setError(null);
    try {
      const res = await fetch(`/api/products?locale=${encodeURIComponent(adminLocaleCode)}`, API);
      const json = (await res.json()) as { products?: ProductSummary[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Failed listing products");
      const summaries = json.products ?? [];
      const full: Record<string, unknown>[] = [];
      for (const item of summaries) {
        const r = await fetch(`/api/products?locale=${encodeURIComponent(adminLocaleCode)}&slug=${encodeURIComponent(item.slug)}`, API);
        const body = (await r.json()) as { product?: Product; slug?: string; error?: string };
        if (r.ok && body.product) {
          full.push(buildFullProductExportDocument({ ...body.product, slug: body.slug ?? item.slug } as Product & { slug?: string }));
        }
      }
      downloadJson(`products-export-${adminLocaleCode}.json`, { products: full });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    }
  }

  // ── Bulk actions ──────────────────────────────────────────────────────────

  const bulkActions: BulkAction<ProductSummary>[] = useMemo(() => [
    {
      key: "export",
      label: "Export selected",
      variant: "secondary",
      handler: async (selected) => {
        const full: Record<string, unknown>[] = [];
        for (const item of selected) {
          const r = await fetch(`/api/products?locale=${encodeURIComponent(adminLocaleCode)}&slug=${encodeURIComponent(item.slug)}`, API);
          const body = (await r.json()) as { product?: Product; slug?: string };
          if (r.ok && body.product) full.push(buildFullProductExportDocument({ ...body.product, slug: body.slug ?? item.slug } as Product & { slug?: string }));
        }
        downloadJson(`products-selected-${adminLocaleCode}.json`, { products: full });
      },
    },
    {
      key: "mark-in-stock",
      label: "Mark In Stock",
      variant: "secondary",
      handler: async (selected, clearSelection) => {
        for (const item of selected) {
          const r = await fetch(`/api/products?locale=${encodeURIComponent(adminLocaleCode)}&slug=${encodeURIComponent(item.slug)}`, API);
          const body = (await r.json()) as { product?: Product; slug?: string };
          if (!r.ok || !body.product) continue;
          await fetch("/api/products", {
            ...API,
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              locale: adminLocaleCode,
              slug: item.slug,
              product: { ...body.product, stock_status: "in_stock", availability: "InStock" },
            }),
          });
        }
        clearSelection();
        await loadProducts();
      },
    },
    {
      key: "mark-out-of-stock",
      label: "Mark Out of Stock",
      variant: "secondary",
      handler: async (selected, clearSelection) => {
        for (const item of selected) {
          const r = await fetch(`/api/products?locale=${encodeURIComponent(adminLocaleCode)}&slug=${encodeURIComponent(item.slug)}`, API);
          const body = (await r.json()) as { product?: Product; slug?: string };
          if (!r.ok || !body.product) continue;
          await fetch("/api/products", {
            ...API,
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              locale: adminLocaleCode,
              slug: item.slug,
              product: { ...body.product, stock_status: "out_of_stock", availability: "OutOfStock" },
            }),
          });
        }
        clearSelection();
        await loadProducts();
      },
    },
  ], [adminLocaleCode]);

  // ── Inline edit save ──────────────────────────────────────────────────────

  const handleInlineEdit = useCallback(async (save: InlineEditSave<ProductSummary>): Promise<ProductSummary> => {
    const { row, colKey, newValue } = save;
    const r = await fetch(`/api/products?locale=${encodeURIComponent(adminLocaleCode)}&slug=${encodeURIComponent(row.slug)}`, API);
    const body = (await r.json()) as { product?: Product; slug?: string; error?: string };
    if (!r.ok || !body.product) throw new Error(body.error || "Failed to load product for edit");

    const updated = { ...body.product };

    // Apply field-specific patch
    if (colKey === "name") {
      updated.productTitle = String(newValue);
      updated.name = String(newValue);
      updated.title = String(newValue);
    } else if (colKey === "mpn") {
      updated.mpn = String(newValue);
    } else if (colKey === "brand") {
      updated.brand = String(newValue);
    } else if (colKey === "category") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updated as any).category = String(newValue);
    } else if (colKey === "price") {
      updated.price = { ...updated.price, value: Number(newValue) };
    } else if (colKey === "stock_status") {
      updated.stock_status = String(newValue) as ProductStockStatus;
    }

    const saveRes = await fetch("/api/products", {
      ...API,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: adminLocaleCode, slug: row.slug, product: updated }),
    });
    const saveBody = (await saveRes.json()) as { error?: string };
    if (!saveRes.ok) throw new Error(saveBody.error || "Save failed");

    await loadProducts();
    return row;
  }, []);

  // ── Bulk delete ───────────────────────────────────────────────────────────

  const handleBulkDelete = useCallback(async (rows: ProductSummary[]) => {
    for (const row of rows) {
      await fetch(`/api/products?locale=${encodeURIComponent(adminLocaleCode)}&slug=${encodeURIComponent(row.slug)}`, {
        ...API,
        method: "DELETE",
      });
    }
    await loadProducts();
  }, []);

  // ── Single product CRUD ───────────────────────────────────────────────────

  const openEditor = useCallback(async (slug: string) => {
    setError(null);
    const res = await fetch(`/api/products?locale=${encodeURIComponent(adminLocaleCode)}&slug=${encodeURIComponent(slug)}`, API);
    const json = (await res.json()) as {
      product?: Product;
      slug?: string;
      error?: string;
      catalogIssues?: CatalogIssue[];
    };
    if (Array.isArray(json.catalogIssues) && json.catalogIssues.length) {
      setCatalogIssues((prev) => mergeCatalogIssues(prev, json.catalogIssues!));
      setCatalogBannerDismissed(false);
    }
    if (res.status === 422) {
      setError(json.error || "Invalid JSON or unreadable product file on disk");
      return;
    }
    if (!res.ok || !json.product) {
      setError(json.error || "Could not load product");
      return;
    }
    const loaded = normalizeProductForSave({ ...(json.product as Product), slug: json.slug || slug });
    setActive(loaded);
    setEditSection("basic");
    setView("edit");
  }, [adminLocaleCode]);

  function createNewProduct() {
    setActive(getEmptyManagedProduct(`product-${Date.now()}`));
    setEditSection("basic");
    setView("edit");
  }

  async function saveProduct() {
    if (!active) return;
    setSaving(true);
    setError(null);
    setActiveSyncResult(null);
    try {
      const normalized = normalizeProductForSave(active);
      const res = await fetch("/api/products", {
        ...API,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: adminLocaleCode, slug: normalized.slug, product: normalized }),
      });
      const json = (await res.json()) as {
        error?: string;
        collectionSync?: { matchedCollections: CollectionMatch[]; isOrphan: boolean; warnings: SyncWarning[] } | null;
      };
      if (!res.ok) throw new Error(json.error || "Save failed");
      if (json.collectionSync) {
        setActiveSyncResult({
          productSlug: normalized.slug,
          matchedCollections: json.collectionSync.matchedCollections,
          isOrphan: json.collectionSync.isOrphan,
          warnings: json.collectionSync.warnings,
        });
      }
      setActive(normalized);
      await loadProducts();
      setView("list");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const deleteProduct = useCallback(
    async (slug: string) => {
      if (!confirm(`Delete "${slug}"?`)) return;
      setError(null);
      const res = await fetch(
        `/api/products?locale=${encodeURIComponent(adminLocaleCode)}&slug=${encodeURIComponent(slug)}`,
        { ...API, method: "DELETE" },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Delete failed");
        return;
      }
      await loadProducts();
      if (active?.slug === slug) {
        setActive(null);
        setView("list");
      }
    },
    [active?.slug, adminLocaleCode, loadProducts],
  );

  const productColumns = useMemo(
    () => makeProductColumns(defaultLocale.urlPrefix, openEditor, deleteProduct),
    [openEditor, deleteProduct],
  );

  async function previewProduct() {
    if (!active) return;
    const slug = slugify(active.slug || active.productTitle || active.id);
    if (!slug) { setError("Set a slug (or product name) before preview."); return; }
    setError(null);
    try {
      const res = await fetch(`/api/products?locale=${encodeURIComponent(adminLocaleCode)}&slug=${encodeURIComponent(slug)}`, API);
      if (!res.ok) { setError("Save the product first — preview needs the catalog file for this slug."); return; }
    } catch { setError("Could not verify the product. Save it, then try preview again."); return; }
    const prefix = defaultLocale.urlPrefix;
    window.open(`/${prefix}/products/${slug}`, "_blank", "noopener,noreferrer");
  }

  function setField<K extends keyof ManagedProduct>(key: K, value: ManagedProduct[K]) {
    if (!active) return;
    setActive({ ...active, [key]: value });
  }

  function patchActive(mutator: (product: ManagedProduct) => ManagedProduct) {
    setActive((prev) => (prev ? mutator(prev) : prev));
  }

  const relatedCandidates = useMemo(() => {
    if (!active) return products;
    const selected = new Set((active.bought_together || []).map((item) => item.slug).filter(Boolean));
    selected.add(active.slug);
    return products.filter((item) => !selected.has(item.slug));
  }, [products, active]);

  function editPanel(key: SectionKey, children: ReactNode) {
    if (editSection !== key) return null;
    const label = PRODUCT_EDIT_NAV.find((x) => x.id === key)?.label ?? key;
    return (
      <section
        role="tabpanel"
        id={`pm-edit-panel-${key}`}
        aria-labelledby={`pm-edit-tab-${key}`}
        className="pm-section pm-section--panel"
        tabIndex={0}
      >
        <h2 className="pm-edit-panel__title">{label}</h2>
        <div className="pm-section__body">{children}</div>
      </section>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const editNavTabs = useMemo(
    () => PRODUCT_EDIT_NAV.map((t) => ({ id: t.id, label: t.label })),
    [],
  );

  return (
    <div className="space-y-6">
      {view === "list" && (
        <CatalogAdminShell
          tabs={ADMIN_PRODUCT_TABS}
          activeTab={adminTab}
          onTabChange={setAdminTab}
        >
          {(tab) => (
            <>
          {tab !== "table" ? <AdminSaveFeedback feedback={layoutFeedback} /> : null}
          {tab === "table" && (
            <>
          <div className="pm-toolbar flex flex-wrap items-center gap-2 mb-4">
              <Button type="button" variant="outline" size="sm" onClick={createNewProduct}>
                New Product
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setImportValidation(null);
                  setImportModalOpen(true);
                }}
              >
                Import JSON…
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void exportAllProductsJson()}>
                Export all JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={syncing}
                onClick={() => void runCollectionSync(false)}
              >
                {syncing ? "Syncing…" : "Sync Collections"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={syncing}
                onClick={() => void runCollectionSync(true)}
              >
                Sync + Auto-Create
              </Button>
          </div>

          

          {/* Sync / Import panel */}
          {showSyncPanel && (importValidation || syncReport) && (
            <div className="pm-sync-panel" ref={syncPanelRef}>
              <div className="pm-sync-panel__header">
                <strong>{importValidation ? "Import Validation Report" : "Collection Sync Report"}</strong>
                <button
                  type="button"
                  className="pm-sync-panel__close"
                  onClick={() => { setShowSyncPanel(false); setImportValidation(null); setSyncReport(null); }}
                >×</button>
              </div>
              {importValidation && (
                <div className="pm-sync-panel__body">
                  <p className="pm-sync-stat">
                    {importValidation.length} imported ·{" "}
                    {importValidation.filter((e) => e.status === "orphan").length} orphan(s) ·{" "}
                    {importValidation.filter((e) => e.status === "ok").length} matched
                  </p>
                  <table className="pm-sync-table">
                    <thead><tr><th>Slug</th><th>Name</th><th>Status</th><th>Collections Matched</th></tr></thead>
                    <tbody>
                      {importValidation.map((entry) => (
                        <tr key={entry.slug} className={entry.status === "orphan" ? "pm-sync-row--orphan" : ""}>
                          <td><code>{entry.slug}</code></td>
                          <td>{entry.name}</td>
                          <td>
                            {entry.status === "orphan"
                              ? <span className="pm-sync-badge pm-sync-badge--orphan">Orphan</span>
                              : <span className="pm-sync-badge pm-sync-badge--ok">✓ Matched</span>}
                          </td>
                          <td>
                            {entry.matchedCollections.length === 0
                              ? <span className="pm-sync-none">none</span>
                              : entry.matchedCollections.map((c) => <span key={c.slug} className="pm-sync-chip">{c.name}</span>)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {syncReport && !importValidation && (
                <div className="pm-sync-panel__body">
                  <div className="pm-sync-stats">
                    <span className="pm-sync-stat">{syncReport.totalProducts} products</span>
                    <span className="pm-sync-stat">{syncReport.totalCollections} collections</span>
                    {syncReport.orphanProducts > 0 && <span className="pm-sync-stat pm-sync-stat--warn">{syncReport.orphanProducts} orphans</span>}
                    {syncReport.ambiguousMatches > 0 && <span className="pm-sync-stat pm-sync-stat--warn">{syncReport.ambiguousMatches} ambiguous</span>}
                    {syncReport.newCollectionsCreated > 0 && <span className="pm-sync-stat pm-sync-stat--ok">+{syncReport.newCollectionsCreated} created</span>}
                    {syncReport.warnings.length > 0 && <span className="pm-sync-stat pm-sync-stat--warn">{syncReport.warnings.length} warning(s)</span>}
                  </div>
                  {syncReport.warnings.length > 0 && (
                    <div className="pm-sync-warnings">
                      {syncReport.warnings.slice(0, 10).map((w, i) => (
                        <div key={i} className="pm-sync-warning">
                          <span className="pm-sync-wcode">{w.code}</span>
                          {w.message}
                        </div>
                      ))}
                      {syncReport.warnings.length > 10 && (
                        <p className="pm-sync-more">…and {syncReport.warnings.length - 10} more.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Last-save sync result */}
          {activeSyncResult && !showSyncPanel && (
            <div className={`pm-sync-inline ${activeSyncResult.isOrphan ? "pm-sync-inline--orphan" : "pm-sync-inline--ok"}`}>
              <strong>{activeSyncResult.productSlug}</strong>
              {activeSyncResult.isOrphan
                ? " → not matched to any collection"
                : ` → matched: ${activeSyncResult.matchedCollections.map((c) => c.name).join(", ")}`}
              <button type="button" className="pm-sync-inline__close" onClick={() => setActiveSyncResult(null)}>×</button>
            </div>
          )}

          {error && <p className="pm-error">{error}</p>}

          {catalogIssues.length > 0 && !catalogBannerDismissed && (
            <div className="pm-catalog-alert" role="alert">
              <div className="pm-catalog-alert__head">
                <strong>Catalog data issues ({catalogIssues.length})</strong>
                <button type="button" className="pm-catalog-alert__dismiss" onClick={() => setCatalogBannerDismissed(true)}>
                  Dismiss
                </button>
              </div>
              <p className="pm-catalog-alert__hint">
                Invalid JSON or missing required fields under <code>src/data/</code>. Fix files locally or use{" "}
                <a href="/admin?view=json-editor">JSON Editor</a>.
              </p>
              <ul className="pm-catalog-alert__list">
                {catalogIssues.slice(0, 25).map((issue, i) => (
                  <li key={`${issue.slug}-${issue.kind}-${i}`}>
                    <span className={`pm-catalog-alert__kind pm-catalog-alert__kind--${issue.kind}`}>{issue.kind}</span>{" "}
                    <code>{issue.slug}</code>
                    {issue.locale != null && issue.locale !== "" && (
                      <span className="pm-catalog-alert__loc"> ({issue.locale})</span>
                    )}
                    {issue.filePath != null && issue.filePath !== "" && (
                      <span className="pm-catalog-alert__path"> · {issue.filePath}</span>
                    )}
                    <div className="pm-catalog-alert__msg">{issue.message}</div>
                    {issue.fields != null && issue.fields.length > 0 && (
                      <div className="pm-catalog-alert__fields">Fields: {issue.fields.join(", ")}</div>
                    )}
                  </li>
                ))}
              </ul>
              {catalogIssues.length > 25 && (
                <p className="pm-catalog-alert__more">…and {catalogIssues.length - 25} more issue(s).</p>
              )}
            </div>
          )}

          {/* DataTable — replaces the old flat <table> */}
          <DataTable<ProductSummary>
            id="admin-products-v3"
            data={products}
            columns={productColumns}
            filters={PRODUCT_FILTERS}
            bulkActions={bulkActions}
            getRowKey={(row) => row.slug}
            onInlineEdit={handleInlineEdit}
            onBulkDelete={handleBulkDelete}
            loading={loading}
            emptyMessage={tableEmptyMessage}
            searchFields={["name", "brand", "mpn", "category", "slug"]}
            rowClassName={(row) =>
              [
                row.in_stock === false ? "pm-row--out-of-stock" : "",
                catalogIssueSlugSet.has(row.slug) ? "pm-row--catalog-issue" : "",
              ]
                .filter(Boolean)
                .join(" ")
            }
            stickyHeaderTop={56}
            toolbarLeft={
              <span className="apm-table-persist-hint" title="Column order, visibility, filters, sort, and density persist locally">
                Saved view
              </span>
            }
            toolbarRight={
              <button
                type="button"
                className="dt-btn dt-btn--primary"
                onClick={createNewProduct}
              >
                + New Product
              </button>
            }
          />
            </>
          )}

          {tab === "buy-now" && (
            <ProductBuyNowSettingsPanel
              buyNow={globalBuyNow}
              setBuyNow={setGlobalBuyNow}
              onDirty={() => markUnsaved()}
            />
          )}

          {tab === "quote-cta" && (
            <ProductQuoteCtaSettingsPanel
              locale={adminLocaleCode}
              cta={globalCta}
              setCta={setGlobalCta}
              externalHint={globalExternalHint}
              setExternalHint={setGlobalExternalHint}
              onDirty={() => markUnsaved()}
            />
          )}

          {tab === "page-elements" && (
            <ProductPageElementsPanel
              pageDisplay={pageDisplay}
              setPageDisplay={setPageDisplay}
              elementOrder={elementOrder}
              setElementOrder={setElementOrder}
              compactDisplay={pageCompactDisplay}
              setCompactDisplay={setPageCompactDisplay}
              onDirty={() => markUnsaved()}
            />
          )}

          {tab === "page-layout" && (
            <ProductPageAppearancePanel
              pageLayout={pageLayout}
              setPageLayout={setPageLayout}
              onDirty={() => markUnsaved()}
            />
          )}

          {tab === "card-appearance" && (
            <ProductCardAppearancePanel
              cardLayout={cardLayout}
              setCardLayout={setCardLayout}
              onDirty={() => markUnsaved()}
            />
          )}

          {tab === "promo-banner" && (
            <ProductPromoSettingsPanel
              locale={adminLocaleCode}
              promo={pagePromo}
              setPromo={setPagePromo}
              onDirty={() => markUnsaved()}
            />
          )}

          {tab === "trust-widget" && (
            <ProductTrustSettingsPanel
              trust={pageTrust}
              setTrust={setPageTrust}
              onDirty={() => markUnsaved()}
            />
          )}
            </>
        )}
        </CatalogAdminShell>
      )}

      {view === "edit" && active && (
        <div className="pm-edit space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold tracking-tight">
                {active.productTitle || active.slug || "Edit product"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Slug: {active.slug}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setView("list")}>
                Back to list
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  active &&
                  downloadJson(`${active.slug || "product"}.json`, buildFullProductExportDocument(active))
                }
              >
                Export JSON
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void previewProduct()}>
                Preview
              </Button>
              <Button type="button" size="sm" onClick={() => void saveProduct()} disabled={saving}>
                {saving ? "Saving…" : "Save product"}
              </Button>
            </div>
          </div>

          {error && <p className="pm-error">{error}</p>}

          <AdminSettingsLayout
            tabs={editNavTabs}
            activeTab={editSection}
            onTabChange={(id) => setEditSection(id as SectionKey)}
            className="!space-y-4"
          >
            {(sectionId) => (
          <div className="pm-edit__panels">
          {editPanel("basic",
            <div className="pm-grid">
              <label>
                Name
                <input
                  value={active.productTitle}
                  onChange={(e) => {
                    const value = readControlledInputValue(e);
                    patchActive((prev) => ({ ...prev, productTitle: value, name: value, title: value }));
                  }}
                />
              </label>
              <label>
                Slug
                <input value={active.slug} onChange={(e) => setField("slug", slugify(readControlledInputValue(e)))} />
              </label>
              <label>
                Brand
                <input
                  value={active.brand || ""}
                  list="pm-brand-suggestions"
                  onChange={(e) => setField("brand", readControlledInputValue(e))}
                />
                <datalist id="pm-brand-suggestions">
                  {initialCatalogBrands.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </label>
              <label>
                Category
                <input value={active.category || ""} onChange={(e) => setField("category", readControlledInputValue(e) as Product["category"])} />
              </label>
              <label>
                SKU / MPN
                <input value={active.mpn || ""} onChange={(e) => setField("mpn", readControlledInputValue(e))} />
              </label>
              <label>
                Categories (comma separated)
                <input
                  value={(active.categories || []).join(", ")}
                  onChange={(e) =>
                    setField("categories", readControlledInputValue(e).split(",").map((t) => t.trim()).filter(Boolean))
                  }
                />
              </label>
              <label>
                Tags (comma separated)
                <input
                  value={(active.tags || []).join(", ")}
                  list="pm-tag-suggestions"
                  onChange={(e) =>
                    setField("tags", readControlledInputValue(e).split(",").map((t) => t.trim()).filter(Boolean))
                  }
                />
                <datalist id="pm-tag-suggestions">
                  {initialCatalogTags.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </label>
            </div>,
          )}

          {editPanel("media",
            <ProductMediaSection
              media={active.media}
              productTitle={active.productTitle}
              patchActive={patchActive}
              openMediaPicker={openMediaPicker}
            />,
          )}

          {editPanel("pricing",
            <div className="pm-stack">
              <p className="pm-hint">
                Default price and compare price used when a variation mix row has no price set.
              </p>
              <div className="pm-grid">
              <label>Default price
                <input type="number" value={active.price.value}
                  onChange={(e) => patchActive((prev) => ({ ...prev, price: { ...prev.price, value: Number(readControlledInputValue(e) || 0) } }))} />
              </label>
              <label>Default compare price
                <input type="number" value={active.old_price ?? 0}
                  onChange={(e) => setField("old_price", Number(readControlledInputValue(e) || 0))} />
              </label>
              <label>Currency
                <select value={active.price.currency}
                  onChange={(e) => patchActive((prev) => ({ ...prev, price: { ...prev.price, currency: readControlledInputValue(e) as Product["price"]["currency"] } }))}>
                  <option value="USD">USD</option><option value="EUR">EUR</option>
                  <option value="AED">AED</option><option value="GBP">GBP</option><option value="JPY">JPY</option>
                </select>
              </label>
              <label>Availability
                <select value={active.availability || "InStock"} onChange={(e) => setField("availability", readControlledInputValue(e) as ProductAvailability)}>
                  <option value="InStock">InStock</option><option value="OutOfStock">OutOfStock</option>
                  <option value="PreOrder">PreOrder</option><option value="RequestQuote">RequestQuote</option>
                </select>
              </label>
              <label>Stock Status
                <select value={active.stock_status || "in_stock"} onChange={(e) => setField("stock_status", readControlledInputValue(e) as ProductStockStatus)}>
                  <option value="in_stock">in_stock</option>
                  <option value="out_of_stock">out_of_stock</option>
                  <option value="preorder">preorder</option>
                </select>
              </label>
              </div>
            </div>,
          )}

          {editPanel("variations",
            <ProductVariationsEditor
              product={active}
              onChange={(patch) => patchActive((prev) => ({ ...prev, ...patch }))}
            />,
          )}

          {editPanel("page-display", active ? (
            <div className="pm-stack">
              <p className="pm-hint">Override global page element visibility and blocks for this product only.</p>
              <ProductPageDisplayFields
                showInherit
                value={active.page_display ?? {}}
                onChange={(partial) =>
                  patchActive((prev) => ({
                    ...prev,
                    page_display: { ...(prev.page_display ?? {}), ...partial },
                  }))
                }
              />
              <fieldset className="apm-fieldset">
                <legend className="apm-fieldset__legend">Buy Now slug override</legend>
                <p className="apm-fieldset__hint">
                  Optional. Leave empty to use this product&apos;s slug in the global shop URL path.
                </p>
                <label className="pm-cta-field pm-span-2">
                  <span>Shop URL slug segment</span>
                  <input
                    value={active.buy_now_slug ?? ""}
                    placeholder={active.slug || "Inherit product slug"}
                    onChange={(e) =>
                      patchActive((prev) => ({
                        ...prev,
                        buy_now_slug: readControlledInputValue(e) || undefined,
                      }))
                    }
                  />
                </label>
              </fieldset>
            </div>
          ) : null)}

          {editPanel("description",
            <div className="pm-grid">
              <label>Short Description
                <textarea value={active.short_description || ""} onChange={(e) => setField("short_description", readControlledInputValue(e))} />
              </label>
              <label>SEO Description
                <textarea value={active.description || ""} onChange={(e) => setField("description", readControlledInputValue(e))} />
              </label>
              <div className="pm-span-all pm-detailed">
                <div className="pm-detailed__head">
                  <strong>Detailed description</strong>
                  <span className="pm-hint">Sections with optional heading + body.</span>
                </div>
                <button type="button"
                  onClick={() => patchActive((prev) => ({
                    ...prev,
                    detailed_description: [...normalizeDetailedDescriptionInput(prev.detailed_description), { heading: "", text: "" }],
                  }))}>
                  + Add section
                </button>
                {(normalizeDetailedDescriptionInput(active.detailed_description).length
                  ? normalizeDetailedDescriptionInput(active.detailed_description)
                  : [{ heading: "", text: "" }]
                ).map((block, idx, arr) => (
                  <div key={`det-${idx}`} className="pm-detailed__block">
                    <div className="pm-detailed__block-top">
                      <span className="pm-detailed__idx">Section {idx + 1}</span>
                      <button type="button" className="pm-btn-danger pm-btn-icon" disabled={arr.length <= 1}
                        onClick={() => patchActive((prev) => {
                          const cur = normalizeDetailedDescriptionInput(prev.detailed_description);
                          if (cur.length <= 1) return prev;
                          return { ...prev, detailed_description: cur.filter((_, i) => i !== idx) };
                        })}>×</button>
                    </div>
                    <input value={block.heading} placeholder="Heading (optional)"
                      onChange={(e) => patchActive((prev) => {
                        const cur = [...normalizeDetailedDescriptionInput(prev.detailed_description)];
                        const blk = cur[idx] ?? { heading: "", text: "" };
                        cur[idx] = { heading: readControlledInputValue(e), text: blk.text };
                        return { ...prev, detailed_description: cur };
                      })} />
                    <textarea placeholder="Body text" value={block.text} rows={4}
                      onChange={(e) => patchActive((prev) => {
                        const cur = [...normalizeDetailedDescriptionInput(prev.detailed_description)];
                        const blk2 = cur[idx] ?? { heading: "", text: "" };
                        cur[idx] = { heading: blk2.heading, text: readControlledInputValue(e) };
                        return { ...prev, detailed_description: cur };
                      })} />
                  </div>
                ))}
              </div>
            </div>,
          )}

          {editPanel("specifications",
            <div className="pm-stack">
              <button type="button"
                onClick={() => patchActive((prev) => ({ ...prev, specifications: [...(prev.specifications || []), { technology: "", features: [], items: [] }] }))}>
                Add Group
              </button>
              {(active.specifications || []).map((group, idx) => (
                <div key={`spec-${idx}`} className="pm-card">
                  <input value={group.technology || ""} placeholder="Group name"
                    onChange={(e) => patchActive((prev) => {
                      const copy = [...(prev.specifications || [])];
                      copy[idx] = { ...objectPatch(copy[idx]), technology: readControlledInputValue(e) };
                      return { ...prev, specifications: copy };
                    })} />
                  <textarea
                    value={(group.items || []).map((item) => `${item.name || ""}:${item.value || ""}`).join("\n")}
                    placeholder="Rows as key:value, one per line"
                    onChange={(e) => patchActive((prev) => {
                      const rows = readControlledInputValue(e).split("\n").map((l) => l.trim()).filter(Boolean)
                        .map((l) => { const [name, ...rest] = l.split(":"); return { name: name?.trim() || "", value: rest.join(":").trim() }; });
                      const copy = [...(prev.specifications || [])];
                      copy[idx] = { ...objectPatch(copy[idx]), items: rows };
                      return { ...prev, specifications: copy };
                    })} />
                </div>
              ))}
            </div>,
          )}

          {editPanel("documents",
            <div className="pm-stack">
              <p className="pm-hint">Link to hosted PDFs or upload a small file (data URL).</p>
              <button type="button"
                onClick={() => patchActive((prev) => ({ ...prev, documents: [...(prev.documents || []), { title: "", url: "" }] }))}>
                + Add document
              </button>
              {(active.documents || []).map((doc, idx) => (
                <div key={`doc-${idx}`} className="pm-media-card">
                  <div className="pm-media-card__row">
                    <input value={doc.title || ""} placeholder="Title"
                      onChange={(e) => patchActive((prev) => {
                        const copy = [...(prev.documents || [])];
                        copy[idx] = { ...objectPatch(copy[idx]), title: readControlledInputValue(e) };
                        return { ...prev, documents: copy };
                      })} />
                    <input value={doc.url || ""} placeholder="Document URL"
                      onChange={(e) => patchActive((prev) => {
                        const copy = [...(prev.documents || [])];
                        copy[idx] = { ...objectPatch(copy[idx]), url: readControlledInputValue(e) };
                        return { ...prev, documents: copy };
                      })} />
                    <button type="button" className="pm-btn-secondary"
                      onClick={async () => {
                        const data = await readFileAsDataUrl(".pdf,.doc,.docx,application/pdf");
                        if (!data) return;
                        patchActive((prev) => {
                          const copy = [...(prev.documents || [])];
                          copy[idx] = { ...objectPatch(copy[idx]), url: data };
                          return { ...prev, documents: copy };
                        });
                      }}>Upload</button>
                    <button type="button" className="pm-btn-danger pm-btn-icon"
                      onClick={() => patchActive((prev) => {
                        const copy = [...(prev.documents || [])];
                        copy.splice(idx, 1);
                        return { ...prev, documents: copy };
                      })}>×</button>
                  </div>
                </div>
              ))}
            </div>,
          )}

          {editPanel("shipping",
            <div className="pm-grid">
              <label>Shipping Class
                <input value={(active.shipping?.options?.[0]?.["class"] as string | undefined) ?? ""}
                  onChange={(e) => patchActive((prev) => ({
                    ...prev,
                    shipping: { options: [{ ...(prev.shipping?.options?.[0] ?? {}), class: readControlledInputValue(e) }] },
                  }))} />
              </label>
              <label>Origin
                <input value={(active.shipping?.options?.[0]?.["origin"] as string | undefined) ?? ""}
                  onChange={(e) => patchActive((prev) => ({
                    ...prev,
                    shipping: { options: [{ ...(prev.shipping?.options?.[0] ?? {}), origin: readControlledInputValue(e) }] },
                  }))} />
              </label>
              <label>Weight
                <input value={(active.shipping?.options?.[0]?.["weight"] as string | undefined) ?? ""}
                  onChange={(e) => patchActive((prev) => ({
                    ...prev,
                    shipping: { options: [{ ...(prev.shipping?.options?.[0] ?? {}), weight: readControlledInputValue(e) }] },
                  }))} />
              </label>
              <label>Dimensions
                <input value={(active.shipping?.options?.[0]?.["dimensions"] as string | undefined) ?? ""}
                  onChange={(e) => patchActive((prev) => ({
                    ...prev,
                    shipping: { options: [{ ...(prev.shipping?.options?.[0] ?? {}), dimensions: readControlledInputValue(e) }] },
                  }))} />
              </label>
            </div>,
          )}

          {editPanel("related",
            <div className="pm-stack">
              <p className="pm-hint">Products shown in "Frequently bought together" on the product page.</p>
              <div className="pm-row">
                <select value={relatedProductSlug} onChange={(e) => setRelatedProductSlug(readControlledInputValue(e))}>
                  <option value="">Select a product...</option>
                  {relatedCandidates.map((item) => (
                    <option key={`rel-opt-${item.slug}`} value={item.slug}>{item.name} ({item.slug})</option>
                  ))}
                </select>
                <button type="button"
                  onClick={() => {
                    if (!relatedProductSlug) return;
                    const selected = products.find((p) => p.slug === relatedProductSlug);
                    if (!selected) return;
                    patchActive((prev) => ({
                      ...prev,
                      bought_together: [...(prev.bought_together || []), {
                        slug: selected.slug,
                        name: selected.name,
                        price: selected.price.value,
                        currency: selected.price.currency,
                        mpn: selected.mpn || "",
                        availability: selected.availability || (selected.in_stock === false ? "OutOfStock" : "InStock"),
                        url: `/products/${selected.slug}`,
                      }],
                    }));
                    setRelatedProductSlug("");
                  }}>Add</button>
              </div>
              {(active.bought_together || []).length === 0
                ? <p className="pm-note">No related products selected.</p>
                : (active.bought_together || []).map((item, idx) => (
                  <div key={`related-${idx}-${item.slug || item.name || "item"}`} className="pm-media-card">
                    <div className="pm-media-card__row">
                      <input value={item.name || ""} readOnly />
                      <input value={item.slug || ""} readOnly />
                      <button type="button" className="pm-btn-danger pm-btn-icon"
                        onClick={() => patchActive((prev) => {
                          const copy = [...(prev.bought_together || [])];
                          copy.splice(idx, 1);
                          return { ...prev, bought_together: copy };
                        })}>×</button>
                    </div>
                  </div>
                ))}
            </div>,
          )}

          {editPanel("reviews",
            <div className="pm-grid">
              <label>Average Rating
                <input type="number" step="0.1" value={active.reviews.rating}
                  onChange={(e) => patchActive((prev) => ({ ...prev, reviews: { ...prev.reviews, rating: Number(readControlledInputValue(e) || 0) } }))} />
              </label>
              <label>Count
                <input type="number" value={active.reviews.count}
                  onChange={(e) => patchActive((prev) => ({ ...prev, reviews: { ...prev.reviews, count: Number(readControlledInputValue(e) || 0) } }))} />
              </label>
              <label className="pm-span-all">Manual Comments (name|date|text per line)
                <textarea
                  value={(active.reviews.comments || []).map((c) => `${c.name || "User"}|${c.date || ""}|${c.text || ""}`).join("\n")}
                  onChange={(e) =>
                    patchActive((prev) => ({
                      ...prev,
                      reviews: {
                        ...prev.reviews,
                        comments: readControlledInputValue(e).split("\n").map((l) => l.trim()).filter(Boolean)
                          .map((l) => { const [name, date, text] = l.split("|"); return { name: (name || "").trim(), date: (date || "").trim(), text: (text || "").trim(), photos: [] }; }),
                      },
                    }))
                  }
                />
              </label>
            </div>,
          )}

          {editPanel("cta",
            <div className="pm-stack">
              <p className="pm-hint">
                Optional per-product overrides merged on top of the global CTA from the Products list tab. Empty / inherit uses global values.
                Export/import preserves <code>product_cta</code>.
              </p>
              <button
                type="button"
                className="pm-btn-secondary"
                onClick={() => patchActive((prev) => {
                  const next = { ...prev };
                  delete next.product_cta;
                  return next;
                })}
              >
                Clear all CTA overrides
              </button>
              {effectiveProductCta && (
                <div className="pm-cta-prod">
                  <div className="pm-cta-prod__main">
                    {(() => {
                      const pc = active.product_cta ?? {};
                      const pcPl = pc.placements ?? {};
                      return (
                        <div className="pm-cta-grid">
                          <label className="pm-cta-field">
                            <span>Enable CTA</span>
                            <select
                              value={pc.enabled === true ? "on" : pc.enabled === false ? "off" : "inherit"}
                              onChange={(e) => {
                                const v = readControlledInputValue(e);
                                patchActive((prev) => {
                                  const base: ProductCtaPartial = { ...(prev.product_cta ?? {}) };
                                  if (v === "inherit") delete base.enabled;
                                  else base.enabled = v === "on";
                                  return { ...prev, product_cta: Object.keys(base).length ? base : undefined };
                                });
                              }}
                            >
                              <option value="inherit">Inherit global</option>
                              <option value="on">On</option>
                              <option value="off">Off</option>
                            </select>
                          </label>
                          <label className="pm-cta-field">
                            <span>Button text</span>
                            <input
                              value={pc.label ?? ""}
                              placeholder={globalCta.label}
                              onChange={(e) =>
                                patchActive((prev) => ({
                                  ...prev,
                                  product_cta: { ...(prev.product_cta ?? {}), label: readControlledInputValue(e) },
                                }))
                              }
                            />
                          </label>
                          <div className="pm-cta-field pm-span-2">
                            <CtaIconUploadControls
                              faIcon={pc.icon ?? ""}
                              onFaIconChange={(v) =>
                                patchActive((prev) => {
                                  const base: ProductCtaPartial = { ...(prev.product_cta ?? {}) };
                                  if (!v.trim()) delete base.icon;
                                  else base.icon = v;
                                  return { ...prev, product_cta: Object.keys(base).length ? base : undefined };
                                })
                              }
                              iconUrl={pc.iconUrl ?? ""}
                              onIconUrlChange={(v) =>
                                patchActive((prev) => {
                                  const base: ProductCtaPartial = { ...(prev.product_cta ?? {}) };
                                  if (!v.trim()) delete base.iconUrl;
                                  else base.iconUrl = v;
                                  return { ...prev, product_cta: Object.keys(base).length ? base : undefined };
                                })
                              }
                              inheritFa
                            />
                          </div>
                          <label className="pm-cta-field">
                            <span>Variant</span>
                            <select
                              value={pc.variant ?? ""}
                              onChange={(e) =>
                                patchActive((prev) => ({
                                  ...prev,
                                  product_cta: {
                                    ...(prev.product_cta ?? {}),
                                    variant: readControlledInputValue(e) as ProductCtaPartial["variant"],
                                  },
                                }))
                              }
                            >
                              <option value="">(inherit)</option>
                              {(["solid", "outline", "ghost", "link", "soft", "gradient"] as const).map((v) => (
                                <option key={v} value={v}>{v}</option>
                              ))}
                            </select>
                          </label>
                          <label className="pm-cta-field pm-span-2">
                            <span>Link type</span>
                            <select
                              value={pc.linkType ?? ""}
                              onChange={(e) =>
                                patchActive((prev) => {
                                  const v = readControlledInputValue(e) as ProductCtaPartial["linkType"] | "";
                                  const base: ProductCtaPartial = { ...(prev.product_cta ?? {}) };
                                  if (!v) delete base.linkType;
                                  else base.linkType = v;
                                  return { ...prev, product_cta: Object.keys(base).length ? base : undefined };
                                })
                              }
                            >
                              <option value="">(inherit)</option>
                              <option value="internal">Internal</option>
                              <option value="external">External URL</option>
                            </select>
                          </label>
                          {effectiveProductCta.linkType === "internal" ? (
                            <div className="pm-cta-field pm-span-2">
                              <span>Internal destination</span>
                              <InternalLinkSelector
                                locale={adminLocaleCode}
                                linkType="internal"
                                internalPath={effectiveProductCta.internalPath}
                                internalLink={effectiveProductCta.internalLink}
                                onPick={(path, ref) =>
                                  patchActive((prev) => ({
                                    ...prev,
                                    product_cta: {
                                      ...(prev.product_cta ?? {}),
                                      internalPath: path,
                                      internalLink: ref,
                                    },
                                  }))
                                }
                                onClear={() =>
                                  patchActive((prev) => {
                                    const base: ProductCtaPartial = { ...(prev.product_cta ?? {}) };
                                    delete base.internalPath;
                                    delete base.internalLink;
                                    return { ...prev, product_cta: Object.keys(base).length ? base : undefined };
                                  })
                                }
                              />
                              <label className="pm-cta-subfield">
                                <span>Path (override)</span>
                                <input
                                  type="text"
                                  value={pc.internalPath ?? ""}
                                  placeholder={globalCta.internalPath}
                                  onChange={(e) =>
                                    patchActive((prev) => ({
                                      ...prev,
                                      product_cta: { ...(prev.product_cta ?? {}), internalPath: readControlledInputValue(e) },
                                    }))
                                  }
                                  aria-label="Internal path override"
                                />
                              </label>
                            </div>
                          ) : null}
                          {effectiveProductCta.linkType === "external" ? (
                            <label className="pm-cta-field pm-span-2">
                              <span>External URL</span>
                              <input
                                type="url"
                                value={pc.externalUrl ?? ""}
                                placeholder={globalCta.externalUrl || "https://…"}
                                onChange={(e) => {
                                  patchActive((prev) => ({
                                    ...prev,
                                    product_cta: { ...(prev.product_cta ?? {}), externalUrl: readControlledInputValue(e) },
                                  }));
                                  setProductExternalHint(null);
                                }}
                                onBlur={() => {
                                  const raw = pc.externalUrl ?? globalCta.externalUrl;
                                  const v = validateProductCtaExternalUrl(raw);
                                  setProductExternalHint(v.valid ? null : v.message ?? "Invalid URL");
                                }}
                                aria-invalid={Boolean(productExternalHint)}
                              />
                              {productExternalHint ? (
                                <span className="pm-cta-field__err" role="alert">{productExternalHint}</span>
                              ) : null}
                            </label>
                          ) : null}
                          <label className="pm-cta-field">
                            <span>Open in new tab</span>
                            <select
                              value={
                                pc.openInNewTab === true ? "on" : pc.openInNewTab === false ? "off" : "inherit"
                              }
                              onChange={(e) => {
                                const v = readControlledInputValue(e);
                                patchActive((prev) => {
                                  const base: ProductCtaPartial = { ...(prev.product_cta ?? {}) };
                                  if (v === "inherit") delete base.openInNewTab;
                                  else base.openInNewTab = v === "on";
                                  return { ...prev, product_cta: Object.keys(base).length ? base : undefined };
                                });
                              }}
                            >
                              <option value="inherit">Inherit global</option>
                              <option value="on">Yes</option>
                              <option value="off">No</option>
                            </select>
                          </label>
                          <label className="pm-cta-field">
                            <span>Product page placement</span>
                            <select
                              value={pcPl.inline === true ? "on" : pcPl.inline === false ? "off" : "inherit"}
                              onChange={(e) => {
                                const v = readControlledInputValue(e);
                                patchActive((prev) => {
                                  const base: ProductCtaPartial = { ...(prev.product_cta ?? {}) };
                                  const pl = { ...(base.placements ?? {}) };
                                  if (v === "inherit") delete pl.inline;
                                  else pl.inline = v === "on";
                                  if (Object.keys(pl).length === 0) delete base.placements;
                                  else base.placements = pl;
                                  return { ...prev, product_cta: Object.keys(base).length ? base : undefined };
                                });
                              }}
                            >
                              <option value="inherit">Inherit</option>
                              <option value="on">Show</option>
                              <option value="off">Hide</option>
                            </select>
                          </label>
                          <label className="pm-cta-field">
                            <span>Floating on product page</span>
                            <select
                              value={pcPl.floating === true ? "on" : pcPl.floating === false ? "off" : "inherit"}
                              onChange={(e) => {
                                const v = readControlledInputValue(e);
                                patchActive((prev) => {
                                  const base: ProductCtaPartial = { ...(prev.product_cta ?? {}) };
                                  const pl = { ...(base.placements ?? {}) };
                                  if (v === "inherit") delete pl.floating;
                                  else pl.floating = v === "on";
                                  if (Object.keys(pl).length === 0) delete base.placements;
                                  else base.placements = pl;
                                  return { ...prev, product_cta: Object.keys(base).length ? base : undefined };
                                });
                              }}
                            >
                              <option value="inherit">Inherit</option>
                              <option value="on">Show</option>
                              <option value="off">Hide</option>
                            </select>
                          </label>
                          <label className="pm-cta-field">
                            <span>Product cards</span>
                            <select
                              value={pcPl.card === true ? "on" : pcPl.card === false ? "off" : "inherit"}
                              onChange={(e) => {
                                const v = readControlledInputValue(e);
                                patchActive((prev) => {
                                  const base: ProductCtaPartial = { ...(prev.product_cta ?? {}) };
                                  const pl = { ...(base.placements ?? {}) };
                                  if (v === "inherit") delete pl.card;
                                  else pl.card = v === "on";
                                  if (Object.keys(pl).length === 0) delete base.placements;
                                  else base.placements = pl;
                                  return { ...prev, product_cta: Object.keys(base).length ? base : undefined };
                                });
                              }}
                            >
                              <option value="inherit">Inherit</option>
                              <option value="on">Show</option>
                              <option value="off">Hide</option>
                            </select>
                          </label>
                          <label className="pm-cta-field">
                            <span>Card visibility</span>
                            <select
                              value={pc.cardVisibility ?? ""}
                              onChange={(e) =>
                                patchActive((prev) => {
                                  const v = readControlledInputValue(e) as ProductCtaPartial["cardVisibility"] | "";
                                  const base: ProductCtaPartial = { ...(prev.product_cta ?? {}) };
                                  if (!v) delete base.cardVisibility;
                                  else base.cardVisibility = v;
                                  return { ...prev, product_cta: Object.keys(base).length ? base : undefined };
                                })
                              }
                            >
                              <option value="">(inherit)</option>
                              <option value="always">Always</option>
                              <option value="hover">Hover only</option>
                            </select>
                          </label>
                          <label className="pm-cta-field pm-span-2">
                            <span>Card layout</span>
                            <select
                              value={pc.cardLayout ?? ""}
                              onChange={(e) =>
                                patchActive((prev) => {
                                  const v = readControlledInputValue(e) as ProductCtaCardLayout | "";
                                  const base: ProductCtaPartial = { ...(prev.product_cta ?? {}) };
                                  if (!v) delete base.cardLayout;
                                  else base.cardLayout = v;
                                  return { ...prev, product_cta: Object.keys(base).length ? base : undefined };
                                })
                              }
                            >
                              <option value="">(inherit)</option>
                              <option value="floating_corner">Floating corner</option>
                              <option value="overlay">Overlay</option>
                              <option value="bottom_bar">Bottom bar</option>
                              <option value="inline_meta">Inline with price</option>
                              <option value="quick_action">Quick action</option>
                            </select>
                          </label>
                          <details className="pm-cta-details pm-span-2">
                            <summary>Appearance — product page (diff vs global)</summary>
                            <ProductCtaAppearanceFields
                              context="page"
                              value={effectiveProductCta.appearance.page}
                              onChange={(next) => {
                                const diff = diffResolvedAppearance(globalCta.appearance.page, next);
                                patchActive((prev) => {
                                  const base: ProductCtaPartial = { ...(prev.product_cta ?? {}) };
                                  const app = { ...(base.appearance ?? {}) };
                                  if (Object.keys(diff).length === 0) delete app.page;
                                  else app.page = diff;
                                  if (Object.keys(app).length === 0) delete base.appearance;
                                  else base.appearance = app;
                                  return { ...prev, product_cta: Object.keys(base).length ? base : undefined };
                                });
                              }}
                            />
                          </details>
                          <details className="pm-cta-details pm-span-2">
                            <summary>Appearance — product card (diff vs global)</summary>
                            <ProductCtaAppearanceFields
                              context="card"
                              value={effectiveProductCta.appearance.card}
                              onChange={(next) => {
                                const diff = diffResolvedAppearance(globalCta.appearance.card, next);
                                patchActive((prev) => {
                                  const base: ProductCtaPartial = { ...(prev.product_cta ?? {}) };
                                  const app = { ...(base.appearance ?? {}) };
                                  if (Object.keys(diff).length === 0) delete app.card;
                                  else app.card = diff;
                                  if (Object.keys(app).length === 0) delete base.appearance;
                                  else base.appearance = app;
                                  return { ...prev, product_cta: Object.keys(base).length ? base : undefined };
                                });
                              }}
                            />
                          </details>
                        </div>
                      );
                    })()}
                  </div>
                  <aside className="pm-cta-prod__aside" aria-label="Merged CTA preview">
                    <CtaLivePreview cfg={effectiveProductCta} />
                  </aside>
                </div>
              )}
            </div>,
          )}

          {editPanel("seo",
            <div className="pm-grid">
              <label>Meta Title
                <input value={active.title_extended || ""} onChange={(e) => setField("title_extended", readControlledInputValue(e))} />
              </label>
              <label>Meta Description
                <input value={active.description || ""} onChange={(e) => setField("description", readControlledInputValue(e))} />
              </label>
              <label className="pm-span-all">OG Image
                <input
                  value={active.media?.images?.find((img) => img.type === "main")?.url || ""}
                  onChange={(e) =>
                    patchActive((prev) => {
                      const images = [...(prev.media?.images || [])];
                      const index = images.findIndex((img) => img.type === "main");
                      if (index >= 0) images[index] = { ...objectPatch(images[index]), url: readControlledInputValue(e) };
                      else images.unshift({ url: readControlledInputValue(e), alt: prev.productTitle, type: "main" });
                      return { ...prev, media: { ...prev.media, images } };
                    })
                  }
                />
              </label>
            </div>,
          )}
          </div>
            )}
          </AdminSettingsLayout>
        </div>
      )}

      {/* Media Picker modal — shared for all media fields */}
      <MediaPicker
        isOpen={pickerOpen}
        onClose={() => { setPickerOpen(false); pickerCallbackRef.current = null; }}
        onSelect={(item) => {
          pickerCallbackRef.current?.(item);
          pickerCallbackRef.current = null;
          setPickerOpen(false);
        }}
        accept={pickerAccept}
        title="Select Media"
      />

      {importModalOpen && (
        <ProductBulkImportModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          catalogLocales={catalogLocales}
          adminLocaleCode={adminLocaleCode}
          onDone={handleBulkImportDone}
        />
      )}
    </div>
  );
}
