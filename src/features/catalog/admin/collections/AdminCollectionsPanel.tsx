// @ts-nocheck — ported Astro admin panel.
"use client";

/**
 * AdminCollectionsPanel — AZURA Admin Dashboard
 * Full collection management with DataTable engine, rule editor, hierarchy, sync report.
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useAdminFormState } from "@/hooks/use-admin-form";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import type { PageActions } from "@/stores/admin-ui-store";
import "./AdminCollectionsPanel.css";
import {
  ADMIN_COLLECTION_TABS,
  type AdminCollectionTabId,
} from "@/features/catalog/admin/catalog-admin-tabs";
import { CatalogAdminShell } from "@/features/catalog/admin/catalog-admin-shell";
import {
  CatalogComingSoon,
  CatalogDataGrid,
  CatalogPageHeader,
  CatalogSection,
  CatalogStat,
  CatalogStatGroup,
  CatalogToolbar,
} from "@/features/catalog/admin/ui";
import { TaxonomyHealthSummary } from "@/features/catalog/admin/taxonomy/TaxonomyHealthSummary";
import { ProductPageLayoutTemplateSelect } from "@/features/products/layout-templates/product-page-layout-template-select";
import {
  getProductPageLayoutTemplateMeta,
  validateTemplateId,
} from "@/features/products/layout-templates/registry";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/features/catalog/admin/shared/DataTable";
import type {
  BulkAction,
  ColumnDef,
  DataTableHandle,
  FilterDef,
  InlineEditSave,
} from "@/features/catalog/admin/shared/types";
import { UnifiedMediaPickerDialog } from "@/features/media/components/unified-media-picker-dialog";
import { IMAGE_PICKER_MEDIA_TYPES } from "@/features/media/constants";
import { CollectionBulkImportModal } from "./CollectionBulkImportModal";
import {
  CollectionHierarchyChrome,
  type CollectionHierarchyChromeLabels,
} from "@/features/collections/components/collection-hierarchy-chrome";
import {
  collectionMapFromList,
  isDescendantOrSelf,
} from "@/features/collections/collection-navigation";
import { MatchingRulesEditor } from "@/features/categories/admin/MatchingRulesEditor";
import {
  countRuleLeaves,
  emptyRuleGroup,
  isEmptyRuleTree,
  upgradeLegacyRuleSet,
  type RuleGroup,
} from "@/features/categories/matching";
import type { CollectionMembershipMode } from "@/features/collections/types";

const ADMIN_HIERARCHY_LABELS: CollectionHierarchyChromeLabels = {
  allCollections: "All categories",
  ariaLabel: "Category hierarchy",
  levelRoot: "Root level",
  levelUnder: "Under {parent}",
};

interface Collection {
  id: string;
  slug: string;
  name: string;
  description: string;
  badge?: string;
  coverImage?: string;
  iconImage?: string;
  parentSlug?: string;
  seo?: { metaTitle?: string; metaDescription?: string; canonicalPath?: string };
  conditions: RuleGroup;
  membershipMode?: CollectionMembershipMode;
  cardTemplate?: "default" | "featured" | "compact";
  pageLayoutTemplate?: string | null;
  sortBy?: "price-asc" | "price-desc" | "name-asc" | "name-desc" | "newest";
  visible?: boolean;
  showInNav?: boolean;
  featured?: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface ValidationWarning {
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

interface ProductSyncStatus {
  slug: string;
  name: string;
  brand?: string;
  category?: string;
  categories: string[];
  matchedCollections: Array<{ slug: string; name: string; depth: number }>;
  isOrphan: boolean;
  hasAmbiguity: boolean;
}

interface SyncReport {
  generatedAt: string;
  locale: string;
  totalProducts: number;
  totalCollections: number;
  orphanProducts: number;
  ambiguousMatches: number;
  newCollectionsCreated: number;
  warnings: ValidationWarning[];
  productStatuses: ProductSyncStatus[];
  collectionCounts: Record<string, number>;
  indexesRebuilt?: boolean;
  indexRebuildCounts?: Record<string, number>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const WARNING_COLORS: Record<string, string> = {
  ORPHAN_PRODUCT: "#f59e0b",
  AMBIGUOUS_MATCH: "#f97316",
  FUZZY_SLUG_COLLISION: "#8b5cf6",
  INVALID_RULE: "#ef4444",
  CIRCULAR_HIERARCHY: "#dc2626",
  EMPTY_COLLECTION: "#6b7280",
  DUPLICATE_COLLECTION_SLUG: "#ef4444",
};

function emptyCollection(): Partial<Collection> {
  return {
    slug: "", name: "", description: "", badge: "", coverImage: "", parentSlug: "",
    conditions: emptyRuleGroup("any"),
    membershipMode: "MANUAL",
    cardTemplate: "default", sortBy: "name-asc",
    visible: true, showInNav: false, featured: false,
  };
}

function resolveMembershipMode(form: Partial<Collection>): CollectionMembershipMode {
  if (form.membershipMode) return form.membershipMode;
  const root = normalizeConditions(form.conditions);
  return isEmptyRuleTree(root) ? "MANUAL" : "HYBRID";
}

function normalizeConditions(raw: unknown): RuleGroup {
  return upgradeLegacyRuleSet(raw ?? emptyRuleGroup("any"));
}

function buildHierarchyTree(collections: Collection[]): Array<{ collection: Collection; depth: number }> {
  const bySlug = new Map(collections.map((c) => [c.slug, c]));
  const visited = new Set<string>();
  const result: Array<{ collection: Collection; depth: number }> = [];

  function visit(slug: string, depth: number) {
    if (visited.has(slug)) return;
    visited.add(slug);
    const c = bySlug.get(slug);
    if (!c) return;
    result.push({ collection: c, depth });
    const children = collections
      .filter((ch) => (ch.parentSlug ?? "").trim() === slug)
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const ch of children) visit(ch.slug, depth + 1);
  }

  const roots = collections
    .filter((c) => !c.parentSlug?.trim() || !bySlug.has(c.parentSlug.trim()))
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const r of roots) visit(r.slug, 0);
  for (const c of collections) if (!visited.has(c.slug)) result.push({ collection: c, depth: 0 });
  return result;
}

// ── Column definitions ────────────────────────────────────────────────────────

function makeCollectionColumns(
  counts: Record<string, number>,
  parentOptions: Array<{ slug: string; name: string }>,
  onEdit: (col: Collection) => void,
  onDelete: (col: Collection) => void,
): ColumnDef<Collection>[] {
  return [
    {
      key: "name",
      label: "Name",
      sortable: true,
      hideable: false,
      defaultVisible: true,
      render: (col) => (
        <span>
          <span className="acp-col-name">{col.name}</span>
          {col.badge && <span className="acp-badge" style={{ marginLeft: 6 }}>{col.badge}</span>}
          {col.featured && <span className="acp-badge" style={{ marginLeft: 4, background: "#fef3c7", color: "#92400e" }}>Featured</span>}
        </span>
      ),
      renderEdit: (_col, value, onChange) => (
        <input
          className="dt-inline-input"
          defaultValue={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
      ),
    },
    {
      key: "slug",
      label: "Slug",
      sortable: true,
      hideable: true,
      defaultVisible: true,
      render: (col) => <code className="acp-code">{col.slug}</code>,
      renderEdit: (_col, value, onChange) => (
        <input
          className="dt-inline-input"
          defaultValue={String(value ?? "").toLowerCase()}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
          autoFocus
        />
      ),
    },
    {
      key: "parentSlug",
      label: "Parent",
      sortable: true,
      hideable: true,
      defaultVisible: true,
      render: (col) =>
        col.parentSlug
          ? <code className="acp-code">{col.parentSlug}</code>
          : <span className="acp-muted">—</span>,
      renderEdit: (col, value, onChange) => {
        const options = parentOptions.filter((c) => c.slug !== col.slug);
        const selected = String(value ?? col.parentSlug ?? "");
        return (
          <select
            className="dt-inline-select"
            value={selected}
            onChange={(e) => onChange(e.target.value || undefined)}
            autoFocus
          >
            <option value="">— None (root) —</option>
            {options.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name} ({c.slug})
              </option>
            ))}
          </select>
        );
      },
    },
    {
      key: "conditions",
      label: "Rules",
      sortable: false,
      hideable: true,
      defaultVisible: true,
      render: (col) => {
        const root = normalizeConditions(col.conditions);
        const n = countRuleLeaves(root);
        return (
          <span className="acp-rule-summary">
            {root.match.toUpperCase()} · {n} rule{n !== 1 ? "s" : ""}
          </span>
        );
      },
    },
    {
      key: "productCount",
      label: "Products",
      sortable: true,
      hideable: true,
      defaultVisible: true,
      sortFn: (a, b) => (counts[a.slug] ?? 0) - (counts[b.slug] ?? 0),
      render: (col) => {
        const n = counts[col.slug] ?? undefined;
        return (
          <span className={`acp-product-count${n === 0 ? " acp-product-count--zero" : ""}`}>
            {n === undefined ? "—" : n}
          </span>
        );
      },
    },
    {
      key: "visible",
      label: "Visible",
      sortable: true,
      hideable: true,
      defaultVisible: true,
      render: (col) => (
        <span className={`acp-status ${col.visible !== false ? "acp-status--yes" : "acp-status--no"}`}>
          {col.visible !== false ? "✓" : "✗"}
        </span>
      ),
      renderEdit: (_col, value, onChange) => (
        <select className="dt-inline-select" defaultValue={String(value !== false)} onChange={(e) => onChange(e.target.value === "true")} autoFocus>
          <option value="true">Visible</option>
          <option value="false">Hidden</option>
        </select>
      ),
    },
    {
      key: "showInNav",
      label: "In Nav",
      sortable: true,
      hideable: true,
      defaultVisible: false,
      render: (col) => <span style={{ fontSize: 11 }}>{col.showInNav ? "✓" : "—"}</span>,
    },
    {
      key: "sortBy",
      label: "Sort",
      sortable: false,
      hideable: true,
      defaultVisible: false,
      render: (col) => <span style={{ fontSize: 11, color: "#6b7280" }}>{col.sortBy ?? "name-asc"}</span>,
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      hideable: true,
      defaultVisible: false,
      render: (col) => col.createdAt
        ? <span style={{ fontSize: 11, color: "#6b7280" }}>{new Date(col.createdAt).toLocaleDateString()}</span>
        : <span className="acp-muted">—</span>,
    },
    {
      key: "_actions",
      label: "",
      sortable: false,
      hideable: false,
      defaultVisible: true,
      width: "1%",
      render: (col) => (
        <div className="acp-row-actions">
          <button className="acp-btn acp-btn-xs acp-btn-ghost" onClick={(e) => { e.stopPropagation(); onEdit(col); }}>
            Edit
          </button>
          <button className="acp-btn acp-btn-xs acp-btn-danger" onClick={(e) => { e.stopPropagation(); void onDelete(col); }}>
            Delete
          </button>
        </div>
      ),
    },
  ];
}

// ── Filter definitions ────────────────────────────────────────────────────────

const COLLECTION_FILTERS: FilterDef<Collection>[] = [
  {
    key: "parentSlug",
    label: "Parent",
    type: "select",
    field: "parentSlug",
    getOptions: (data) => {
      const parents = [...new Set(data.map((c) => c.parentSlug).filter(Boolean) as string[])];
      return [{ value: "__root__", label: "Root (no parent)" }, ...parents.map((p) => ({ value: p, label: p }))];
    },
    filter: (row, value) => {
      if (!value) return true;
      if (value === "__root__") return !row.parentSlug?.trim();
      return row.parentSlug === String(value);
    },
  },
  {
    key: "visible",
    label: "Visibility",
    type: "boolean",
    field: "visible",
  },
  {
    key: "featured",
    label: "Featured",
    type: "boolean",
    field: "featured",
  },
  {
    key: "showInNav",
    label: "In Nav",
    type: "boolean",
    field: "showInNav",
  },
  {
    key: "cardTemplate",
    label: "Template",
    type: "select",
    field: "cardTemplate",
    options: [
      { value: "default", label: "Default" },
      { value: "featured", label: "Featured" },
      { value: "compact", label: "Compact" },
    ],
  },
];

// ── Collection form ───────────────────────────────────────────────────────────

export type CollectionSaveMode = "save" | "update" | "publish";

export type CollectionFormHandle = {
  submit: (mode: CollectionSaveMode) => Promise<void>;
};

function CollectionFormInner({
  initial, collections, onSave, onRegisterSubmit,
}: {
  initial: Partial<Collection>;
  collections: Collection[];
  onSave: (data: Partial<Collection>, mode: CollectionSaveMode) => Promise<void>;
  onCancel?: () => void;
  onRegisterSubmit?: (submit: ((mode: CollectionSaveMode) => Promise<void>) | null) => void;
}, ref: React.Ref<CollectionFormHandle>) {
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const [form, setForm] = useState<Partial<Collection>>(() => ({
    ...initial,
    membershipMode: resolveMembershipMode(initial),
  }));
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      ...initial,
      membershipMode: resolveMembershipMode(initial),
    });
    setFormError(null);
  }, [initial.slug, initial.updatedAt]);

  const set = (patch: Partial<Collection>) => {
    markUnsaved();
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = useCallback(async (mode: CollectionSaveMode) => {
    if (!form.slug?.trim()) {
      setFormError("Slug is required");
      throw new Error("Slug is required");
    }
    if (!form.name?.trim()) {
      setFormError("Name is required");
      throw new Error("Name is required");
    }
    setFormError(null);
    const membershipMode = form.membershipMode ?? resolveMembershipMode(form);
    // Dual-write note: empty conditions + MANUAL persist as MANUAL on Category;
    // RULES/HYBRID keep conditions for rule membership rebuild.
    await onSave({ ...form, membershipMode }, mode);
  }, [form, onSave]);

  useImperativeHandle(ref, () => ({
    submit: handleSubmit,
  }), [handleSubmit]);

  useEffect(() => {
    onRegisterSubmit?.(handleSubmit);
    return () => onRegisterSubmit?.(null);
  }, [handleSubmit, onRegisterSubmit]);

  const availableParents = collections.filter((c) => c.slug !== form.slug);

  return (
    <div className="acp-form space-y-4">
      <CatalogSection title="General" description="Identity and basic taxonomy fields.">
        <div className="acp-form-grid">
          <div className="acp-field">
            <label className="acp-label">Slug *</label>
            <input className="acp-input" value={form.slug ?? ""}
              onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
              placeholder="category-slug" />
          </div>
          <div className="acp-field">
            <label className="acp-label">Name *</label>
            <input className="acp-input" value={form.name ?? ""}
              onChange={(e) => set({ name: e.target.value })} placeholder="Category Name" />
          </div>
          <div className="acp-field acp-field-wide">
            <label className="acp-label">Description</label>
            <textarea className="acp-input acp-textarea" rows={3}
              value={form.description ?? ""} onChange={(e) => set({ description: e.target.value })} />
          </div>
          <div className="acp-field">
            <label className="acp-label">Badge</label>
            <input className="acp-input" value={form.badge ?? ""} onChange={(e) => set({ badge: e.target.value })} />
          </div>
        </div>
      </CatalogSection>

      <CatalogSection title="Appearance" description="Banner, icon, and card presentation.">
        <div className="acp-form-grid">
          <div className="acp-field">
            <label className="acp-label">Category Banner</label>
            <input
              className="acp-input"
              value={form.coverImage ?? ""}
              onChange={(e) => set({ coverImage: e.target.value })}
              placeholder="URL or pick from media"
            />
            <div className="acp-media-pick-row">
              {form.coverImage && (
                <img src={form.coverImage} alt="Banner preview" className="acp-img-preview acp-img-preview--banner" />
              )}
              <UnifiedMediaPickerDialog
                mediaTypes={IMAGE_PICKER_MEDIA_TYPES}
                defaultSource="cms"
                onSelect={(result) => set({ coverImage: result.url })}
                trigger={
                  <button type="button" className="acp-btn acp-btn-secondary">
                    Choose from Media
                  </button>
                }
              />
              {form.coverImage && (
                <button type="button" className="acp-btn acp-btn-ghost" onClick={() => set({ coverImage: "" })}>
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="acp-field">
            <label className="acp-label">Category Icon</label>
            <input
              className="acp-input"
              value={form.iconImage ?? ""}
              onChange={(e) => set({ iconImage: e.target.value })}
              placeholder="URL or pick from media"
            />
            <div className="acp-media-pick-row">
              {form.iconImage && (
                <img src={form.iconImage} alt="Icon preview" className="acp-img-preview acp-img-preview--icon" />
              )}
              <UnifiedMediaPickerDialog
                mediaTypes={IMAGE_PICKER_MEDIA_TYPES}
                defaultSource="cms"
                onSelect={(result) => set({ iconImage: result.url })}
                trigger={
                  <button type="button" className="acp-btn acp-btn-secondary">
                    Choose from Media
                  </button>
                }
              />
              {form.iconImage && (
                <button type="button" className="acp-btn acp-btn-ghost" onClick={() => set({ iconImage: "" })}>
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="acp-field">
            <label className="acp-label">Card Template</label>
            <select className="acp-select" value={form.cardTemplate ?? "default"}
              onChange={(e) => set({ cardTemplate: e.target.value as Collection["cardTemplate"] })}>
              <option value="default">Default</option>
              <option value="featured">Featured</option>
              <option value="compact">Compact</option>
            </select>
          </div>
          <div className="acp-field">
            <ProductPageLayoutTemplateSelect
              id="collection-page-layout-template"
              label="Product page layout"
              inheritLabel="Inherit (site default)"
              value={form.pageLayoutTemplate}
              onChange={(pageLayoutTemplate) => set({ pageLayoutTemplate })}
              hint={
                form.pageLayoutTemplate
                  ? `${getProductPageLayoutTemplateMeta(validateTemplateId(form.pageLayoutTemplate)).label} applies to products in this category unless a product override is set.`
                  : "Products in this category inherit the brand assignment, then the site default, unless a product override is set."
              }
            />
          </div>
          <div className="acp-field">
            <label className="acp-label">Sort By</label>
            <select className="acp-select" value={form.sortBy ?? "name-asc"}
              onChange={(e) => set({ sortBy: e.target.value as Collection["sortBy"] })}>
              <option value="name-asc">Name A→Z</option>
              <option value="name-desc">Name Z→A</option>
              <option value="price-asc">Price Low→High</option>
              <option value="price-desc">Price High→Low</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>
      </CatalogSection>

      <CatalogSection title="Hierarchy" description="Parent category and breadcrumb position.">
        <div className="acp-form-grid">
          <div className="acp-field">
            <label className="acp-label">Parent Category</label>
            <select className="acp-select" value={form.parentSlug ?? ""}
              onChange={(e) => set({ parentSlug: e.target.value || undefined })}>
              <option value="">— None (root) —</option>
              {availableParents.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name} ({c.slug})</option>
              ))}
            </select>
          </div>
        </div>
      </CatalogSection>

      <CatalogSection title="Products" description="Manual and rule-based membership.">
        <CatalogComingSoon
          title="Category product assignment"
          description="Assign products, review manual vs rule matches, and manage exclusions."
          phaseHint="Available in Phase 2."
        />
      </CatalogSection>

      <CatalogSection title="Matching Rules" description="Products that match these rules are included by the membership engine.">
        <MatchingRulesEditor
          value={normalizeConditions(form.conditions)}
          onChange={(conditions) => set({ conditions })}
        />
      </CatalogSection>

      <CatalogSection title="Navigation" description="Contextual catalog navigation for this category.">
        <p className="mb-2 text-sm text-muted-foreground">
          Configure Inherit / Extend / Replace items for this category scope in the Navigation builder.
        </p>
        <Button asChild type="button" size="sm" variant="outline">
          <Link href={`/admin/catalog/navigation?scopeType=CATEGORY&scopeId=${encodeURIComponent(form.slug || "")}`}>
            Open Navigation Builder
          </Link>
        </Button>
      </CatalogSection>

      <CatalogSection title="SEO" description="Search metadata for the category storefront page.">
        <div className="acp-form-grid">
          <div className="acp-field">
            <label className="acp-label">SEO Title</label>
            <input className="acp-input" value={form.seo?.metaTitle ?? ""}
              onChange={(e) => set({ seo: { ...form.seo, metaTitle: e.target.value } })} />
          </div>
        </div>
      </CatalogSection>

      <CatalogSection title="Visibility" description="Storefront visibility and navigation flags.">
        <div className="acp-field acp-field-checks">
          <label className="acp-check">
            <input type="checkbox" checked={form.visible !== false} onChange={(e) => set({ visible: e.target.checked })} />
            Visible
          </label>
          <label className="acp-check">
            <input type="checkbox" checked={form.showInNav === true} onChange={(e) => set({ showInNav: e.target.checked })} />
            Show in Nav
          </label>
          <label className="acp-check">
            <input type="checkbox" checked={form.featured === true} onChange={(e) => set({ featured: e.target.checked })} />
            Featured
          </label>
        </div>
      </CatalogSection>

      <CatalogSection title="Advanced" description="Membership mode dual-writes to Category (empty conditions → MANUAL when unset).">
        <fieldset className="space-y-2 text-sm">
          {(["MANUAL", "RULES", "HYBRID"] as CollectionMembershipMode[]).map((mode) => (
            <label key={mode} className="flex items-start gap-2">
              <input
                type="radio"
                name="membershipMode"
                className="mt-1"
                checked={(form.membershipMode ?? "MANUAL") === mode}
                onChange={() => set({ membershipMode: mode })}
              />
              <span>
                <span className="font-medium">{mode}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {mode === "MANUAL" && "Only explicit product assignments; rule memberships cleared on sync."}
                  {mode === "RULES" && "Membership derived from Matching Rules only."}
                  {mode === "HYBRID" && "Manual assignments plus rule matches (manual wins on overlap)."}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      </CatalogSection>

      {formError && <div className="acp-error">{formError}</div>}
    </div>
  );
}

const CollectionForm = forwardRef(CollectionFormInner);

// ── Hierarchy node ────────────────────────────────────────────────────────────

function HierarchyNode({
  collection, depth, productCount, onEdit,
}: {
  collection: Collection;
  depth: number;
  productCount: number;
  onEdit: () => void;
}) {
  return (
    <div className="acp-tree-node" style={{ paddingLeft: `${depth * 20 + 8}px` }}>
      <span className="acp-tree-arrow">{depth > 0 ? "└─ " : ""}</span>
      <span className={`acp-tree-dot ${collection.visible === false ? "acp-tree-dot--hidden" : ""}`} />
      <span className="acp-tree-name">{collection.name}</span>
      <span className="acp-tree-slug">/{collection.slug}</span>
      <span className="acp-tree-count">{productCount} products</span>
      {collection.parentSlug && <span className="acp-tree-parent">← {collection.parentSlug}</span>}
      <button className="acp-btn acp-btn-xs acp-btn-ghost" onClick={onEdit}>Edit</button>
    </div>
  );
}

// ── Warn badge ────────────────────────────────────────────────────────────────

function WarnBadge({ code }: { code: string }) {
  const color = WARNING_COLORS[code] ?? "#6b7280";
  return <span className="acp-warn-badge" style={{ background: color }}>{code.replace(/_/g, " ")}</span>;
}

const API: RequestInit = { credentials: "include" };

type DeleteChildrenMode = "cascade" | "reparent";

type DeleteChildrenPrompt = {
  rows: Collection[];
  blocked: Array<{ row: Collection; children: Collection[] }>;
};

function cloneCollections(cols: Collection[]): Collection[] {
  return cols.map((c) => ({
    ...c,
    conditions: normalizeConditions(c.conditions),
  }));
}

function collectionDraftFieldsEqual(a: Collection, b: Collection): boolean {
  return (
    a.name === b.name &&
    a.slug === b.slug &&
    a.visible === b.visible &&
    (a.parentSlug ?? "") === (b.parentSlug ?? "")
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

type AdminCollectionsPanelProps = {
  initialCollections?: Collection[];
};

export default function AdminCollectionsPanel({
  initialCollections,
}: AdminCollectionsPanelProps = {}) {
  const hasInitialProps = initialCollections !== undefined;
  const [tab, setTab] = useState<AdminCollectionTabId>("collections");
  const [collections, setCollections] = useState<Collection[]>(() =>
    cloneCollections(initialCollections ?? []),
  );
  const [savedCollections, setSavedCollections] = useState<Collection[]>(() =>
    cloneCollections(initialCollections ?? []),
  );
  const [loading, setLoading] = useState(!hasInitialProps);
  const [syncing, setSyncing] = useState(false);
  const [report, setReport] = useState<SyncReport | null>(null);
  const [editTarget, setEditTarget] = useState<Collection | "new" | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [collectionScope, setCollectionScope] = useState<string | null>(null);
  const [deleteProgress, setDeleteProgress] = useState<{
    current: number;
    total: number;
    label: string;
  } | null>(null);
  const [deleteChildrenPrompt, setDeleteChildrenPrompt] = useState<DeleteChildrenPrompt | null>(null);
  const [deleteChildrenBusy, setDeleteChildrenBusy] = useState(false);
  const deletePromptResolverRef = useRef<((mode: DeleteChildrenMode | null) => void) | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collectionFormRef = useRef<CollectionFormHandle>(null);
  const formSubmitRef = useRef<((mode: CollectionSaveMode) => Promise<void>) | null>(null);
  const dataTableRef = useRef<DataTableHandle>(null);
  const collectionsRef = useRef(collections);
  const savedCollectionsRef = useRef(savedCollections);
  collectionsRef.current = collections;
  savedCollectionsRef.current = savedCollections;

  const registerFormSubmit = useCallback(
    (submit: ((mode: CollectionSaveMode) => Promise<void>) | null) => {
      formSubmitRef.current = submit;
    },
    [],
  );

  const markSaved = useAdminUiStore((s) => s.markSaved);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markPublishPending = useAdminUiStore((s) => s.markPublishPending);
  const markPublished = useAdminUiStore((s) => s.markPublished);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);
  const saveStatus = useAdminUiStore((s) => s.saveStatus);

  const downloadJson = (filename: string, data: unknown) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCollections = (rows: Collection[]) => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJson(`collections-export-${stamp}.json`, {
      version: 1,
      exportedAt: new Date().toISOString(),
      collectionCount: rows.length,
      collections: rows,
    });
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    if (successTimer.current) clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => setSuccessMsg(null), 3500);
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchCollections = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setGlobalError(null);
    try {
      const res = await fetch("/api/categories", API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { collections: Collection[] };
      const next = cloneCollections(data.collections ?? []);
      collectionsRef.current = next;
      savedCollectionsRef.current = cloneCollections(next);
      setCollections(next);
      setSavedCollections(cloneCollections(next));
      dataTableRef.current?.clearDirtyKeys();
    } catch (e) {
      if (!options?.silent) {
        setGlobalError(e instanceof Error ? e.message : "Failed to load categories");
      }
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasInitialProps) return;
    void fetchCollections();
  }, [fetchCollections, hasInitialProps]);

  const fetchSyncReport = useCallback(async () => {
    try {
      const res = await fetch("/api/categories/sync?loadReport=1", API);
      if (!res.ok) return;
      const data = (await res.json()) as { report: SyncReport | null };
      if (data.report) setReport(data.report);
    } catch {
      /* non-blocking */
    }
  }, []);

  useEffect(() => {
    void fetchSyncReport();
  }, [fetchSyncReport]);

  // ── Sync ──────────────────────────────────────────────────────────────────

  const runValidate = useCallback(async () => {
    setSyncing(true);
    setGlobalError(null);
    try {
      const res = await fetch("/api/categories/sync", API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { report: SyncReport };
      setReport(data.report);
      setTab("sync");
      showSuccess("Validation complete");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Validation failed";
      setGlobalError(msg);
      throw new Error(msg);
    } finally {
      setSyncing(false);
    }
  }, []);

  const runSync = useCallback(async (
    autoCreate = false,
    options?: { switchTab?: boolean },
  ) => {
    const switchTab = options?.switchTab !== false;
    setSyncing(true);
    setGlobalError(null);
    try {
      const res = await fetch("/api/categories/sync", {
        ...API,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoCreate }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { report: SyncReport };
      setReport(data.report);
      if (switchTab) setTab("sync");
      if (data.report.newCollectionsCreated > 0) await fetchCollections();
      const parts: string[] = [switchTab ? "Sync complete" : "Indexes rebuilt"];
      if (data.report.newCollectionsCreated > 0) {
        parts.push(`${data.report.newCollectionsCreated} new category(ies) created`);
      }
      if (data.report.indexesRebuilt) {
        const counts = data.report.indexRebuildCounts ?? {};
        const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
        parts.push(`indexes rebuilt (${total} products)`);
      }
      showSuccess(parts.join(" — "));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      setGlobalError(msg);
      throw new Error(msg);
    } finally {
      setSyncing(false);
    }
  }, [fetchCollections]);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  /** Patch a category list after a persisted save — avoids a full list refetch. */
  const patchCollectionList = useCallback((
    prev: Collection[],
    saved: Collection,
    options?: { priorSlug?: string; reparentFromSlug?: string },
  ): Collection[] => {
    let next = prev;
    const priorSlug = options?.priorSlug?.trim();
    if (priorSlug && priorSlug !== saved.slug) {
      next = next.filter((c) => c.slug !== priorSlug && c.id !== priorSlug);
    }
    const reparentFrom = options?.reparentFromSlug?.trim();
    if (reparentFrom && reparentFrom !== saved.slug) {
      const updatedAt = saved.updatedAt ?? new Date().toISOString();
      next = next.map((c) =>
        (c.parentSlug ?? "").trim() === reparentFrom
          ? { ...c, parentSlug: saved.slug, updatedAt }
          : c,
      );
    }
    const lookup = priorSlug ?? saved.slug;
    const idx = next.findIndex((c) => c.slug === lookup || c.id === lookup);
    if (idx >= 0) {
      const updated = [...next];
      updated[idx] = saved;
      return updated;
    }
    const bySlug = next.findIndex((c) => c.slug === saved.slug);
    if (bySlug >= 0) {
      const updated = [...next];
      updated[bySlug] = saved;
      return updated;
    }
    return [...next, saved];
  }, []);

  /** Patch draft + saved snapshots after a dialog/API persist. */
  const updateCollectionsAfterSave = useCallback((
    saved: Collection,
    options?: { priorSlug?: string; reparentFromSlug?: string },
  ) => {
    setCollections((prev) => {
      const next = patchCollectionList(prev, saved, options);
      collectionsRef.current = next;
      return next;
    });
    setSavedCollections((prev) => {
      const next = patchCollectionList(prev, saved, options);
      savedCollectionsRef.current = next;
      return next;
    });
  }, [patchCollectionList]);

  const handleSave = useCallback(async (data: Partial<Collection>, mode: CollectionSaveMode) => {
    const isNew = editTarget === "new";
    const payloadData =
      mode === "publish" ? { ...data, visible: true } : data;
    const payload = isNew
      ? payloadData
      : { ...payloadData, originalSlug: (editTarget as Collection).slug };
    const res = await fetch("/api/categories", {
      ...API,
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as {
      collection?: Collection;
      reparentedChildren?: number;
      error?: string;
    };
    if (!res.ok || json.error) throw new Error(json.error ?? "Save failed");

    const priorSlug = !isNew ? (editTarget as Collection).slug : undefined;
    if (json.collection) {
      updateCollectionsAfterSave(json.collection, {
        priorSlug,
        reparentFromSlug:
          priorSlug && priorSlug !== json.collection.slug ? priorSlug : undefined,
      });
    }
    void fetchSyncReport();
    if (mode === "save") {
      setEditTarget(null);
    } else if (json.collection) {
      setEditTarget(json.collection);
    }
    markSaved();
    const messages: Record<CollectionSaveMode, string> = {
      save: isNew ? "Category created" : "Category saved",
      update: "Category updated",
      publish: "Category published",
    };
    let msg = messages[mode];
    if ((json.reparentedChildren ?? 0) > 0) {
      msg += ` — ${json.reparentedChildren} child category(ies) updated`;
    }
    showSuccess(msg);
  }, [editTarget, fetchSyncReport, markSaved, updateCollectionsAfterSave]);

  const submitCollectionForm = useCallback(
    async (mode: CollectionSaveMode) => {
      const submit =
        formSubmitRef.current ??
        (collectionFormRef.current
          ? (mode: CollectionSaveMode) => collectionFormRef.current!.submit(mode)
          : null);
      if (!submit) {
        const msg = "Category form is not ready";
        setGlobalError(msg);
        throw new Error(msg);
      }
      setFormSaving(true);
      setGlobalError(null);
      try {
        await submit(mode);
        return true;
      } catch (e) {
        setGlobalError(e instanceof Error ? e.message : "Save failed");
        throw e;
      } finally {
        setFormSaving(false);
      }
    },
    [],
  );

  const openCollectionEdit = useCallback((col: Collection) => {
    setGlobalError(null);
    setEditTarget(col);
  }, []);

  const openNewCollection = useCallback(() => {
    setGlobalError(null);
    setEditTarget("new");
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditTarget(null);
    setGlobalError(null);
    markSaved();
  }, [markSaved]);

  const getDirtyDraftRows = useCallback((): Array<{
    row: Collection;
    prior: Collection;
  }> => {
    const draft = collectionsRef.current;
    const saved = savedCollectionsRef.current;
    const dirty: Array<{ row: Collection; prior: Collection }> = [];
    for (const row of draft) {
      const prior =
        saved.find((s) => s.id && row.id && s.id === row.id) ??
        saved.find((s) => s.slug === row.slug);
      if (!prior) continue;
      if (!collectionDraftFieldsEqual(row, prior) || prior.slug !== row.slug) {
        dirty.push({ row, prior });
      }
    }
    return dirty;
  }, []);

  const handleListSave = useCallback(async () => {
    await dataTableRef.current?.commitActiveEdit();
    setSaveStatus("saving");
    setGlobalError(null);
    try {
      const dirty = getDirtyDraftRows();
      for (const { row, prior } of dirty) {
        const payload = {
          slug: row.slug,
          originalSlug: prior.slug,
          name: row.name,
          visible: row.visible,
          parentSlug: row.parentSlug ?? "",
        };
        const res = await fetch("/api/categories", {
          ...API,
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as {
          collection?: Collection;
          error?: string;
        };
        if (!res.ok || json.error) throw new Error(json.error ?? "Save failed");
        if (json.collection) {
          const slugRenamed = prior.slug !== json.collection.slug;
          updateCollectionsAfterSave(json.collection, {
            priorSlug: slugRenamed ? prior.slug : undefined,
            reparentFromSlug: slugRenamed ? prior.slug : undefined,
          });
        }
      }

      const snap = cloneCollections(collectionsRef.current);
      savedCollectionsRef.current = snap;
      setSavedCollections(snap);
      dataTableRef.current?.clearDirtyKeys();
      markSaved();
      markPublishPending();
      showSuccess(
        dirty.length > 0
          ? `Saved ${dirty.length} categor${dirty.length === 1 ? "y" : "ies"}`
          : "No pending category edits",
      );
      void fetchSyncReport();
      return true;
    } catch (e) {
      setSaveStatus("error");
      const msg = e instanceof Error ? e.message : "Save failed";
      setGlobalError(msg);
      return false;
    }
  }, [
    getDirtyDraftRows,
    updateCollectionsAfterSave,
    markSaved,
    markPublishPending,
    setSaveStatus,
    fetchSyncReport,
  ]);

  const handleListPublish = useCallback(async () => {
    setGlobalError(null);
    try {
      if (saveStatus === "unsaved" || getDirtyDraftRows().length > 0) {
        const ok = await handleListSave();
        if (!ok) throw new Error("Save failed before publish");
      }
      await runSync(false, { switchTab: false });
      markPublished();
      showSuccess("Categories published");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Publish failed";
      setGlobalError(msg);
      throw e;
    }
  }, [saveStatus, getDirtyDraftRows, handleListSave, runSync, markPublished]);

  const handleListCancel = useCallback(() => {
    dataTableRef.current?.cancelActiveEdit();
    const restored = cloneCollections(savedCollectionsRef.current);
    collectionsRef.current = restored;
    setCollections(restored);
    dataTableRef.current?.clearDirtyKeys();
    setGlobalError(null);
    markSaved();
    showSuccess("Discarded unsaved category edits");
  }, [markSaved]);

  const collectionPageActions = useMemo((): PageActions => {
    if (editTarget) {
      const isNew = editTarget === "new";
      return {
        onCancel: handleCancelEdit,
        canCancel: !formSaving,
        cancelLabel: "Cancel",
        onSave: () => submitCollectionForm("save"),
        saveLabel: isNew ? "Create" : "Save",
        saveTooltip: isNew ? "Create category and close" : "Save category and close",
        canSave: !formSaving,
        ...(isNew
          ? {}
          : {
              onUpdate: () => submitCollectionForm("update"),
              updateLabel: "Save & keep editing",
              updateTooltip: "Save changes without closing the editor",
              canUpdate: !formSaving,
              onPublish: () => submitCollectionForm("publish"),
              publishLabel: "Publish",
              publishTooltip: "Save and publish category",
              canPublish: !formSaving,
            }),
        markSavedOnSaveSuccess: false,
        selfManagedSaveStatus: true,
      };
    }
    // List view: Save/Publish/Cancel manage deferred inline table edits.
    return {
      onSave: () => handleListSave(),
      onPublish: () => handleListPublish(),
      onCancel: handleListCancel,
      saveLabel: "Save",
      publishLabel: "Publish",
      cancelLabel: "Cancel",
      saveTooltip: "Save pending inline category edits",
      publishTooltip: "Save edits and rebuild storefront indexes",
      markSavedOnSaveSuccess: false,
      selfManagedSaveStatus: true,
      canSave: !syncing && !formSaving,
      canPublish: !syncing && !formSaving,
      canCancel: !syncing && !formSaving,
    };
  }, [
    editTarget,
    formSaving,
    handleCancelEdit,
    syncing,
    submitCollectionForm,
    handleListSave,
    handleListPublish,
    handleListCancel,
  ]);

  useAdminFormState(collectionPageActions);

  const findBlockedDeletes = useCallback((rows: Collection[], all: Collection[]) => {
    const selectedSlugs = new Set(rows.map((r) => r.slug));
    const remaining = all.filter((c) => !selectedSlugs.has(c.slug));
    return rows
      .map((row) => ({
        row,
        children: remaining.filter((c) => (c.parentSlug ?? "").trim() === row.slug),
      }))
      .filter(({ children }) => children.length > 0);
  }, []);

  const executeCategoryDeletes = useCallback(async (
    rows: Collection[],
    childrenMode?: DeleteChildrenMode,
  ) => {
    const selectedSlugs = new Set(rows.map((r) => r.slug));
    const bySlug = new Map(collectionsRef.current.map((c) => [c.slug, c]));

    // Cascade: only delete selected roots so nested selections are not deleted twice.
    const targets =
      childrenMode === "cascade"
        ? rows.filter((row) => {
            let p = row.parentSlug?.trim();
            const seen = new Set<string>();
            while (p && !seen.has(p)) {
              seen.add(p);
              if (selectedSlugs.has(p)) return false;
              p = bySlug.get(p)?.parentSlug?.trim();
            }
            return true;
          })
        : rows;

    setDeleteProgress({ current: 0, total: targets.length, label: "Deleting…" });
    const failures: { slug: string; error: string }[] = [];
    const deletedSlugs = new Set<string>();
    const cascadeRemoved = new Set<string>();
    const reparentedByParent = new Map<string, string | undefined>();

    try {
      for (let i = 0; i < targets.length; i++) {
        const row = targets[i]!;
        if (cascadeRemoved.has(row.slug) || deletedSlugs.has(row.slug)) continue;

        setDeleteProgress({
          current: i,
          total: targets.length,
          label: `Deleting ${i + 1} of ${targets.length}`,
        });
        const res = await fetch("/api/categories", {
          ...API,
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: row.slug,
            ...(childrenMode ? { childrenMode } : {}),
          }),
        });
        const json = (await res.json()) as {
          error?: string;
          removedChildren?: string[];
          reparentedChildren?: string[];
        };
        if (!res.ok || json.error) {
          failures.push({ slug: row.slug, error: json.error ?? `HTTP ${res.status}` });
        } else {
          deletedSlugs.add(row.slug);
          for (const slug of json.removedChildren ?? []) cascadeRemoved.add(slug);
          if (childrenMode === "reparent") {
            const newParent = row.parentSlug?.trim() || undefined;
            for (const slug of json.reparentedChildren ?? []) {
              reparentedByParent.set(slug, newParent);
            }
          }
        }
      }

      if (deletedSlugs.size > 0 || cascadeRemoved.size > 0 || reparentedByParent.size > 0) {
        setCollections((prev) => {
          const next = prev
            .filter((c) => !deletedSlugs.has(c.slug) && !cascadeRemoved.has(c.slug))
            .map((c) => {
              if (!reparentedByParent.has(c.slug)) return c;
              return {
                ...c,
                parentSlug: reparentedByParent.get(c.slug),
                updatedAt: new Date().toISOString(),
              };
            });
          collectionsRef.current = next;
          return next;
        });
        setSavedCollections((prev) => {
          const next = prev
            .filter((c) => !deletedSlugs.has(c.slug) && !cascadeRemoved.has(c.slug))
            .map((c) => {
              if (!reparentedByParent.has(c.slug)) return c;
              return {
                ...c,
                parentSlug: reparentedByParent.get(c.slug),
                updatedAt: new Date().toISOString(),
              };
            });
          savedCollectionsRef.current = next;
          return next;
        });
        if (collectionScope && (deletedSlugs.has(collectionScope) || cascadeRemoved.has(collectionScope))) {
          setCollectionScope(null);
        }
        if (
          editTarget &&
          editTarget !== "new" &&
          (deletedSlugs.has((editTarget as Collection).slug) ||
            cascadeRemoved.has((editTarget as Collection).slug))
        ) {
          setEditTarget(null);
        }
      }

      if (failures.length > 0) {
        const succeeded = targets.length - failures.length;
        throw new Error(
          `Deleted ${succeeded} of ${targets.length} (${failures.length} failed): ${failures[0]!.error}`,
        );
      }

      void fetchSyncReport();
      if (rows.length === 1) {
        showSuccess(`Category "${rows[0]!.name}" deleted`);
      } else {
        showSuccess(`Deleted ${deletedSlugs.size} categories`);
      }
    } finally {
      setDeleteProgress(null);
    }
  }, [collectionScope, editTarget, fetchSyncReport]);

  const askDeleteChildrenMode = useCallback((prompt: DeleteChildrenPrompt) => {
    return new Promise<DeleteChildrenMode | null>((resolve) => {
      deletePromptResolverRef.current = resolve;
      setDeleteChildrenPrompt(prompt);
    });
  }, []);

  const resolveDeleteChildrenPrompt = useCallback((mode: DeleteChildrenMode | null) => {
    setDeleteChildrenPrompt(null);
    const resolve = deletePromptResolverRef.current;
    deletePromptResolverRef.current = null;
    resolve?.(mode);
  }, []);

  const handleDelete = useCallback(async (collection: Collection) => {
    const blocked = findBlockedDeletes([collection], collectionsRef.current);
    if (blocked.length > 0) {
      const mode = await askDeleteChildrenMode({ rows: [collection], blocked });
      if (!mode) return;
      try {
        setDeleteChildrenBusy(true);
        await executeCategoryDeletes([collection], mode);
      } catch (e) {
        setGlobalError(e instanceof Error ? e.message : "Delete failed");
      } finally {
        setDeleteChildrenBusy(false);
      }
      return;
    }
    if (!window.confirm(`Delete category "${collection.name}"? This cannot be undone.`)) return;
    try {
      await executeCategoryDeletes([collection]);
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : "Delete failed");
    }
  }, [askDeleteChildrenMode, executeCategoryDeletes, findBlockedDeletes]);

  // ── Inline edit (deferred draft — persisted by top-bar Save) ──────────────

  const handleInlineEdit = useCallback(async (save: InlineEditSave<Collection>): Promise<Collection> => {
    const { row, colKey, newValue } = save;
    const next: Collection = { ...row };

    if (colKey === "name") next.name = String(newValue);
    else if (colKey === "slug") {
      next.slug = String(newValue).toLowerCase().replace(/[^a-z0-9-]/g, "-");
    } else if (colKey === "visible") next.visible = Boolean(newValue);
    else if (colKey === "parentSlug") {
      next.parentSlug = newValue ? String(newValue) : undefined;
    } else {
      return row;
    }

    const priorSlug = row.slug;
    const slugRenamed = colKey === "slug" && priorSlug !== next.slug;
    let list = collectionsRef.current.map((c) =>
      c.slug === priorSlug || c.id === row.id ? next : c,
    );
    if (slugRenamed) {
      const updatedAt = new Date().toISOString();
      list = list.map((c) =>
        (c.parentSlug ?? "").trim() === priorSlug
          ? { ...c, parentSlug: next.slug, updatedAt }
          : c,
      );
    }
    collectionsRef.current = list;
    setCollections(list);
    markUnsaved();
    return next;
  }, [markUnsaved]);

  // ── Bulk delete ───────────────────────────────────────────────────────────

  const handleBulkDelete = useCallback(async (rows: Collection[]) => {
    const blocked = findBlockedDeletes(rows, collectionsRef.current);
    let childrenMode: DeleteChildrenMode | undefined;
    if (blocked.length > 0) {
      const mode = await askDeleteChildrenMode({ rows, blocked });
      if (!mode) throw new Error("Delete cancelled");
      childrenMode = mode;
    }

    try {
      setDeleteChildrenBusy(true);
      await executeCategoryDeletes(rows, childrenMode);
    } finally {
      setDeleteChildrenBusy(false);
    }
  }, [askDeleteChildrenMode, executeCategoryDeletes, findBlockedDeletes]);

  // ── Bulk actions ──────────────────────────────────────────────────────────

  const bulkActions: BulkAction<Collection>[] = useMemo(() => [
    {
      key: "hide",
      label: "Hide",
      variant: "secondary",
      handler: async (selected, clearSelection, reportProgress) => {
        const total = selected.length;
        reportProgress({ current: 0, total, label: "Hiding collections" });
        for (let i = 0; i < selected.length; i++) {
          const col = selected[i]!;
          reportProgress({ current: i, total, label: `Hiding ${col.slug}` });
          await fetch("/api/categories", {
            ...API,
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...col, visible: false, originalSlug: col.slug }),
          });
          reportProgress({ current: i + 1, total, label: `Hiding ${col.slug}` });
        }
        clearSelection();
        await fetchCollections();
      },
    },
    {
      key: "show",
      label: "Show",
      variant: "secondary",
      handler: async (selected, clearSelection, reportProgress) => {
        const total = selected.length;
        reportProgress({ current: 0, total, label: "Showing collections" });
        for (let i = 0; i < selected.length; i++) {
          const col = selected[i]!;
          reportProgress({ current: i, total, label: `Showing ${col.slug}` });
          await fetch("/api/categories", {
            ...API,
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...col, visible: true, originalSlug: col.slug }),
          });
          reportProgress({ current: i + 1, total, label: `Showing ${col.slug}` });
        }
        clearSelection();
        await fetchCollections();
      },
    },
    {
      key: "export",
      label: "Export JSON",
      variant: "secondary",
      handler: async (selected, clearSelection) => {
        exportCollections(selected);
        clearSelection();
      },
    },
  ], [fetchCollections]);

  // ── Computed ──────────────────────────────────────────────────────────────

  const hierarchyTree = useMemo(() => buildHierarchyTree(collections), [collections]);

  const collectionsBySlug = useMemo(() => collectionMapFromList(collections), [collections]);

  const filteredCollections = useMemo(() => {
    if (!collectionScope?.trim()) return collections;
    return collections.filter((col) =>
      isDescendantOrSelf(col.slug, collectionScope, collectionsBySlug),
    );
  }, [collections, collectionScope, collectionsBySlug]);

  const hierarchyChromeItems = useMemo(
    () =>
      collections.map((c) => ({
        slug: c.slug,
        name: c.name,
        parentSlug: c.parentSlug,
        visible: c.visible !== false,
      })),
    [collections],
  );

  const hierarchyRibbonFooter = useMemo(
    () =>
      hierarchyChromeItems.length > 0 ? (
        <CollectionHierarchyChrome
          collections={hierarchyChromeItems}
          value={collectionScope}
          onChange={setCollectionScope}
          labels={ADMIN_HIERARCHY_LABELS}
          variant="tabs"
          includeHidden
        />
      ) : null,
    [hierarchyChromeItems, collectionScope],
  );

  const orphanProducts = useMemo(() => (report?.productStatuses ?? []).filter((p) => p.isOrphan), [report]);
  const warningsByCode = useMemo(() => {
    if (!report) return {};
    const map: Record<string, ValidationWarning[]> = {};
    for (const w of report.warnings) (map[w.code] ??= []).push(w);
    return map;
  }, [report]);
  const counts = report?.collectionCounts ?? {};

  const parentOptions = useMemo(
    () => collections.map((c) => ({ slug: c.slug, name: c.name })),
    [collections],
  );

  const columns = useMemo(
    () => makeCollectionColumns(counts, parentOptions, openCollectionEdit, handleDelete),
    [counts, parentOptions, openCollectionEdit, handleDelete],
  );

  const issueCount = orphanProducts.length + (report?.warnings.length ?? 0);
  const visibleCount = useMemo(
    () => collections.filter((c) => c.visible !== false).length,
    [collections],
  );
  const inNavCount = useMemo(
    () => collections.filter((c) => c.showInNav === true).length,
    [collections],
  );
  const emptyCount = useMemo(
    () => collections.filter((c) => (counts[c.slug] ?? 0) === 0).length,
    [collections, counts],
  );

  const collectionTabs = useMemo(() => {
    return ADMIN_COLLECTION_TABS.map((t) => {
      if (t.id === "issues" && issueCount > 0) {
        return { ...t, label: `Issues (${issueCount})` };
      }
      return t;
    });
  }, [issueCount]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <CatalogPageHeader
        title="Categories"
        description="Build and manage your product taxonomy."
        actions={
          <CatalogToolbar>
            <Button
              type="button"
              size="sm"
              onClick={openNewCollection}
              disabled={!!deleteProgress}
            >
              + New Category
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void runValidate()}
              disabled={syncing || !!deleteProgress}
              title="Preview category rule matches — no writes"
            >
              {syncing ? "Working…" : "Validate"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void runSync(false)}
              disabled={syncing || !!deleteProgress}
              title="Sync against existing categories only — never auto-creates"
            >
              {syncing ? "Syncing…" : "Sync Categories"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => exportCollections(collections)}
              disabled={!collections.length || !!deleteProgress}
            >
              Export
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
              disabled={!!deleteProgress}
            >
              Import
            </Button>
          </CatalogToolbar>
        }
      />

      <CatalogStatGroup>
        <CatalogStat
          label="Categories"
          value={collections.length}
          active={tab === "collections"}
          onClick={() => setTab("collections")}
        />
        <CatalogStat label="Visible" value={visibleCount} />
        <CatalogStat label="In Navigation" value={inNavCount} />
        <CatalogStat label="Empty" value={emptyCount} warn={emptyCount > 0} />
        <CatalogStat
          label="Unmatched"
          value={orphanProducts.length}
          warn={orphanProducts.length > 0}
          active={tab === "issues"}
          onClick={() => setTab("issues")}
        />
      </CatalogStatGroup>

      <TaxonomyHealthSummary
        total={collections.length}
        empty={emptyCount}
        unmatched={orphanProducts.length}
        warnings={report?.warnings.length ?? 0}
      />

      {globalError && (
        <div className="acp-alert acp-alert-error">
          {globalError}
          <button className="acp-alert-close" type="button" onClick={() => setGlobalError(null)}>
            ×
          </button>
        </div>
      )}
      {successMsg && <div className="acp-alert acp-alert-success">{successMsg}</div>}

      {deleteProgress && (
        <div className="acp-op-progress" role="status" aria-live="polite">
          <div className="acp-op-progress__bar">
            <div
              className="acp-op-progress__fill"
              style={{
                width: `${Math.round((deleteProgress.current / deleteProgress.total) * 100)}%`,
              }}
            />
          </div>
          <p className="acp-op-progress__text">
            {deleteProgress.label} ({deleteProgress.current}/{deleteProgress.total})
          </p>
        </div>
      )}

      <CollectionBulkImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={async (summary) => {
          await fetchCollections();
          await fetchSyncReport();
          showSuccess(
            `Imported ${summary.aggregate.created} new, updated ${summary.aggregate.updated} category(ies)`,
          );
          setImportOpen(false);
        }}
      />

      <CatalogAdminShell
        tabs={collectionTabs}
        activeTab={tab}
        onTabChange={setTab}
        ribbonFooter={hierarchyRibbonFooter}
      >
        {(panelTab) => (
          <>
      {panelTab === "collections" && (
        <CatalogDataGrid>
          <DataTable<Collection>
            ref={dataTableRef}
            id="admin-collections"
            data={filteredCollections}
            columns={columns}
            filters={COLLECTION_FILTERS}
            bulkActions={bulkActions}
            getRowKey={(col) => col.slug}
            onInlineEdit={handleInlineEdit}
            inlineEditMode="deferred"
            onBulkDelete={handleBulkDelete}
            loading={loading}
            emptyMessage="No categories found. Create a new category."
            searchFields={["name", "slug", "description", "parentSlug", "badge"]}
            onRowClick={openCollectionEdit}
            rowClassName={(col) => col.visible === false ? "acp-row--hidden" : ""}
          />
        </CatalogDataGrid>
      )}

      {panelTab === "products" && (
        <CatalogComingSoon
          title="Category products"
          description="Browse and assign products across the taxonomy with manual, rule, and hybrid views."
          phaseHint="Available in Phase 2."
        />
      )}

      {panelTab === "rules" && (
        <CatalogComingSoon
          title="Matching Rules overview"
          description="Browse rules across categories with live match impact. Edit rules inside each category for now."
          phaseHint="Matching Rules 2.0 arrives in Phase 3."
        />
      )}

      {panelTab === "hierarchy" && (
        <>
          <div className="acp-hierarchy-legend">
            <span className="acp-tree-dot acp-tree-dot--visible" /> Visible &nbsp;
            <span className="acp-tree-dot acp-tree-dot--hidden" /> Hidden
          </div>
          <div className="acp-tree">
            {hierarchyTree.map(({ collection, depth }) => (
              <HierarchyNode
                key={collection.slug}
                collection={collection}
                depth={depth}
                productCount={counts[collection.slug] ?? 0}
                onEdit={() => openCollectionEdit(collection)}
              />
            ))}
          </div>
        </>
      )}

      {panelTab === "sync" && (
        <>
          {!report ? (
            <div className="acp-empty">Run <strong>Validate</strong> or <strong>Sync Categories</strong> to generate a report.</div>
          ) : (
            <>
              <div className="acp-report-meta">
                Generated: {new Date(report.generatedAt).toLocaleString()} · Locale: {report.locale}
                {report.newCollectionsCreated > 0 && (
                  <span className="acp-badge acp-badge--new"> +{report.newCollectionsCreated} created</span>
                )}
                {report.indexesRebuilt && (
                  <span className="acp-badge acp-badge--new"> indexes rebuilt</span>
                )}
              </div>
              <div className="acp-report-stats">
                <div className="acp-stat"><span className="acp-stat-val">{report.totalProducts}</span><span className="acp-stat-lbl">Products</span></div>
                <div className="acp-stat"><span className="acp-stat-val">{report.totalCollections}</span><span className="acp-stat-lbl">Categories</span></div>
                <div className={`acp-stat ${report.orphanProducts > 0 ? "acp-stat--warn" : ""}`}>
                  <span className="acp-stat-val">{report.orphanProducts}</span><span className="acp-stat-lbl">Orphan Products</span>
                </div>
                <div className={`acp-stat ${report.ambiguousMatches > 0 ? "acp-stat--warn" : ""}`}>
                  <span className="acp-stat-val">{report.ambiguousMatches}</span><span className="acp-stat-lbl">Ambiguous</span>
                </div>
                <div className={`acp-stat ${report.warnings.length > 0 ? "acp-stat--warn" : "acp-stat--ok"}`}>
                  <span className="acp-stat-val">{report.warnings.length}</span><span className="acp-stat-lbl">Warnings</span>
                </div>
              </div>

              <h4 className="acp-section-title">Product Assignment</h4>
              <DataTable<ProductSyncStatus>
                id="admin-sync-report"
                data={report.productStatuses}
                getRowKey={(p) => p.slug}
                columns={[
                  {
                    key: "slug",
                    label: "Product",
                    sortable: true,
                    render: (p) => (
                      <div>
                        <code className="acp-code">{p.slug}</code>
                        <div className="acp-muted" style={{ fontSize: 11 }}>{p.name}</div>
                      </div>
                    ),
                  },
                  { key: "brand", label: "Brand", sortable: true, render: (p) => <span>{p.brand ?? <span className="acp-muted">—</span>}</span> },
                  {
                    key: "category",
                    label: "Category",
                    sortable: true,
                    render: (p) => (
                      <span>
                        {p.category ?? "—"}
                        {p.categories.length > 1 && <span className="acp-cats"> +{p.categories.length - 1}</span>}
                      </span>
                    ),
                  },
                  {
                    key: "matchedCollections",
                    label: "Categories",
                    sortable: false,
                    render: (p) =>
                      p.matchedCollections.length === 0 ? (
                        <span className="acp-warn-inline">none</span>
                      ) : (
                        <div className="acp-match-list">
                          {p.matchedCollections.map((m) => (
                            <span key={m.slug} className="acp-match-chip">
                              {m.name} <span className="acp-muted">d{m.depth}</span>
                            </span>
                          ))}
                        </div>
                      ),
                  },
                  {
                    key: "status",
                    label: "Status",
                    sortable: true,
                    sortFn: (a, b) => Number(b.isOrphan) - Number(a.isOrphan),
                    render: (p) => (
                      <>
                        {p.isOrphan && <span className="acp-status acp-status--orphan">Orphan</span>}
                        {p.hasAmbiguity && <span className="acp-status acp-status--ambig">Ambiguous</span>}
                        {!p.isOrphan && !p.hasAmbiguity && <span className="acp-status acp-status--ok">✓</span>}
                      </>
                    ),
                  },
                ]}
                rowClassName={(p) => p.isOrphan ? "acp-row--orphan" : ""}
                emptyMessage="No product statuses."
                noVirtualize
              />
            </>
          )}
        </>
      )}

      {panelTab === "issues" && (
        <>
          <h4 className="acp-section-title">Review Unmatched</h4>
          {orphanProducts.length === 0 ? (
            <div className="acp-empty acp-empty--ok">
              {report
                ? "No unmatched products — every product matches at least one category."
                : "Run Validate or Sync Categories to detect unmatched products."}
            </div>
          ) : (
            <>
              <p className="acp-desc">
                These products do not match any category. Assign them manually or{" "}
                <strong>Create Category</strong> explicitly — Sync never auto-creates categories.
              </p>
              <DataTable<ProductSyncStatus>
                id="admin-orphans"
                data={orphanProducts}
                getRowKey={(p) => p.slug}
                columns={[
                  { key: "slug", label: "Slug", sortable: true, render: (p) => <code className="acp-code">{p.slug}</code> },
                  { key: "name", label: "Name", sortable: true, render: (p) => <span>{p.name}</span> },
                  { key: "brand", label: "Brand", sortable: true, render: (p) => <span>{p.brand ?? "—"}</span> },
                  { key: "category", label: "Category", sortable: true, render: (p) => <span>{p.category ?? "—"}</span> },
                  {
                    key: "categories",
                    label: "Tags",
                    sortable: false,
                    render: (p) => (
                      <div className="acp-tag-list">
                        {p.categories.map((c) => <span key={c} className="acp-tag">{c}</span>)}
                      </div>
                    ),
                  },
                ]}
                rowClassName={() => "acp-row--orphan"}
                emptyMessage="No unmatched products."
                noVirtualize
              />
            </>
          )}

          <h4 className="acp-section-title" style={{ marginTop: 24 }}>Warnings</h4>
          {!report ? (
            <div className="acp-empty">Run Validate or Sync Categories to see warnings.</div>
          ) : report.warnings.length === 0 ? (
            <div className="acp-empty acp-empty--ok">No warnings — all checks passed.</div>
          ) : (
            Object.entries(warningsByCode).map(([code, warns]) => (
              <div key={code} className="acp-warn-group">
                <div className="acp-warn-group-header">
                  <WarnBadge code={code} />
                  <span className="acp-warn-group-count">{warns.length}</span>
                </div>
                {warns.map((w, i) => (
                  <div key={i} className="acp-warn-item">
                    <span>{w.message}</span>
                    {w.context && <pre className="acp-warn-context">{JSON.stringify(w.context, null, 2)}</pre>}
                  </div>
                ))}
              </div>
            ))
          )}
        </>
      )}
            </>
          )}
        </CatalogAdminShell>

      <Dialog
        open={deleteChildrenPrompt !== null}
        onOpenChange={(open) => {
          if (!open && !deleteChildrenBusy) resolveDeleteChildrenPrompt(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {deleteChildrenPrompt && deleteChildrenPrompt.rows.length === 1
                ? `Delete "${deleteChildrenPrompt.rows[0]!.name}"?`
                : `Delete ${deleteChildrenPrompt?.rows.length ?? 0} categories?`}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  {deleteChildrenPrompt?.blocked.length === 1
                    ? "This category has child categories. Choose how to handle them:"
                    : "Some selected categories have child categories. Choose how to handle them:"}
                </p>
                <ul className="list-disc space-y-1 ps-5">
                  {(deleteChildrenPrompt?.blocked ?? []).map(({ row, children }) => (
                    <li key={row.slug}>
                      <span className="font-medium text-foreground">{row.name}</span>
                      {" "}has {children.length} child{children.length === 1 ? "" : "ren"}:{" "}
                      {children.map((c) => c.slug).join(", ")}
                    </li>
                  ))}
                </ul>
                <p>
                  <strong className="font-medium text-foreground">Delete with children</strong>
                  {" "}removes the category and all nested child categories.
                </p>
                <p>
                  <strong className="font-medium text-foreground">Move children up</strong>
                  {" "}keeps child categories and attaches them to the parent level
                  {deleteChildrenPrompt?.blocked.length === 1 &&
                  deleteChildrenPrompt.blocked[0]!.row.parentSlug?.trim()
                    ? ` (under "${deleteChildrenPrompt.blocked[0]!.row.parentSlug}")`
                    : deleteChildrenPrompt?.blocked.length === 1
                      ? " (root)"
                      : ""}
                  .
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            <Button
              type="button"
              variant="destructive"
              disabled={deleteChildrenBusy}
              onClick={() => resolveDeleteChildrenPrompt("cascade")}
            >
              Delete with children
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={deleteChildrenBusy}
              onClick={() => resolveDeleteChildrenPrompt("reparent")}
            >
              Move children up
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={deleteChildrenBusy}
              onClick={() => resolveDeleteChildrenPrompt(null)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open && !formSaving) handleCancelEdit();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editTarget === "new"
                ? "New category"
                : editTarget
                  ? `Edit: ${(editTarget as Collection).name}`
                  : "Category"}
            </DialogTitle>
          </DialogHeader>
          {editTarget !== null && (
            <CollectionForm
              ref={collectionFormRef}
              key={
                editTarget === "new"
                  ? "new"
                  : `${(editTarget as Collection).slug}-${(editTarget as Collection).updatedAt ?? ""}`
              }
              initial={editTarget === "new" ? emptyCollection() : { ...(editTarget as Collection) }}
              collections={collections}
              onSave={handleSave}
              onRegisterSubmit={registerFormSubmit}
            />
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={formSaving}
              onClick={handleCancelEdit}
            >
              Cancel
            </Button>
            {editTarget && editTarget !== "new" ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={formSaving}
                  onClick={() => void submitCollectionForm("update")}
                >
                  {formSaving ? "Saving…" : "Save & keep editing"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={formSaving}
                  onClick={() => void submitCollectionForm("publish")}
                >
                  Publish
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              disabled={formSaving}
              onClick={() => void submitCollectionForm("save")}
            >
              {formSaving ? "Saving…" : editTarget === "new" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
