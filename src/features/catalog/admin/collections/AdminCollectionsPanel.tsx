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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/features/catalog/admin/shared/DataTable";
import type { BulkAction, ColumnDef, FilterDef, InlineEditSave } from "@/features/catalog/admin/shared/types";
import { MediaPickerButton } from "@/features/catalog/admin/media/MediaPicker";
import { CollectionBulkImportModal } from "./CollectionBulkImportModal";
import {
  CollectionHierarchyChrome,
  type CollectionHierarchyChromeLabels,
} from "@/features/collections/components/collection-hierarchy-chrome";
import {
  collectionMapFromList,
  isDescendantOrSelf,
} from "@/features/collections/collection-navigation";

const ADMIN_HIERARCHY_LABELS: CollectionHierarchyChromeLabels = {
  allCollections: "All collections",
  ariaLabel: "Collection hierarchy",
  levelRoot: "Root level",
  levelUnder: "Under {parent}",
};

interface CollectionRule {
  field: "category" | "categories" | "tags" | "brand" | "title" | "badge" | "status" | "stock";
  operator: "equals" | "contains" | "starts_with" | "not_equals";
  value: string;
}

interface CollectionConditions {
  match: "any" | "all";
  rules: CollectionRule[];
}

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
  conditions: CollectionConditions;
  cardTemplate?: "default" | "featured" | "compact";
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

const RULE_FIELDS: CollectionRule["field"][] = [
  "brand", "category", "categories", "title", "tags", "badge", "status", "stock",
];
const RULE_OPS: CollectionRule["operator"][] = [
  "contains", "equals", "starts_with", "not_equals",
];

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
    conditions: { match: "any", rules: [] },
    cardTemplate: "default", sortBy: "name-asc",
    visible: true, showInNav: false, featured: false,
  };
}

function emptyRule(): CollectionRule {
  return { field: "brand", operator: "contains", value: "" };
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
      render: (col) => (
        <span className="acp-rule-summary">
          {col.conditions.match.toUpperCase()} · {col.conditions.rules.length} rule{col.conditions.rules.length !== 1 ? "s" : ""}
        </span>
      ),
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

// ── Rule editor sub-component ─────────────────────────────────────────────────

function RuleEditor({
  rule, index, onChange, onRemove,
}: {
  rule: CollectionRule;
  index: number;
  onChange: (r: CollectionRule) => void;
  onRemove: () => void;
}) {
  return (
    <div className="acp-rule-row">
      <span className="acp-rule-num">{index + 1}</span>
      <select className="acp-select acp-rule-field" value={rule.field}
        onChange={(e) => onChange({ ...rule, field: e.target.value as CollectionRule["field"] })}>
        {RULE_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>
      <select className="acp-select acp-rule-op" value={rule.operator}
        onChange={(e) => onChange({ ...rule, operator: e.target.value as CollectionRule["operator"] })}>
        {RULE_OPS.map((op) => <option key={op} value={op}>{op}</option>)}
      </select>
      <input className="acp-input acp-rule-val" type="text" placeholder="value"
        value={rule.value} onChange={(e) => onChange({ ...rule, value: e.target.value })} />
      <button className="acp-btn acp-btn-icon acp-btn-danger" onClick={onRemove} title="Remove rule">×</button>
    </div>
  );
}

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
  const [form, setForm] = useState<Partial<Collection>>(initial);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initial);
    setFormError(null);
  }, [initial.slug, initial.updatedAt]);

  const set = (patch: Partial<Collection>) => {
    markUnsaved();
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const setRule = (i: number, rule: CollectionRule) => {
    const rules = [...(form.conditions?.rules ?? [])];
    rules[i] = rule;
    set({ conditions: { match: form.conditions?.match ?? "any", rules } });
  };
  const addRule = () => {
    const rules = [...(form.conditions?.rules ?? []), emptyRule()];
    set({ conditions: { match: form.conditions?.match ?? "any", rules } });
  };
  const removeRule = (i: number) => {
    const rules = (form.conditions?.rules ?? []).filter((_, idx) => idx !== i);
    set({ conditions: { match: form.conditions?.match ?? "any", rules } });
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
    await onSave(form, mode);
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
    <div className="acp-form">
      <div className="acp-form-grid">
        <div className="acp-field">
          <label className="acp-label">Slug *</label>
          <input className="acp-input" value={form.slug ?? ""}
            onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
            placeholder="collection-slug" />
        </div>
        <div className="acp-field">
          <label className="acp-label">Name *</label>
          <input className="acp-input" value={form.name ?? ""}
            onChange={(e) => set({ name: e.target.value })} placeholder="Collection Name" />
        </div>
        <div className="acp-field acp-field-wide">
          <label className="acp-label">Description</label>
          <textarea className="acp-input acp-textarea" rows={3}
            value={form.description ?? ""} onChange={(e) => set({ description: e.target.value })} />
        </div>
        <div className="acp-field">
          <label className="acp-label">Parent Collection</label>
          <select className="acp-select" value={form.parentSlug ?? ""}
            onChange={(e) => set({ parentSlug: e.target.value || undefined })}>
            <option value="">— None (root) —</option>
            {availableParents.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name} ({c.slug})</option>
            ))}
          </select>
        </div>
        <div className="acp-field">
          <label className="acp-label">Badge</label>
          <input className="acp-input" value={form.badge ?? ""} onChange={(e) => set({ badge: e.target.value })} />
        </div>
        <div className="acp-field">
          <label className="acp-label">Collection Banner</label>
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
            <MediaPickerButton
              accept={["image", "svg"]}
              title="Select Collection Banner"
              label="Choose from Media"
              className="acp-btn acp-btn-secondary"
              onSelect={(item) => set({ coverImage: item.url })}
            />
            {form.coverImage && (
              <button type="button" className="acp-btn acp-btn-ghost" onClick={() => set({ coverImage: "" })}>
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="acp-field">
          <label className="acp-label">Collection Icon</label>
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
            <MediaPickerButton
              accept={["image", "svg"]}
              title="Select Collection Icon"
              label="Choose from Media"
              className="acp-btn acp-btn-secondary"
              onSelect={(item) => set({ iconImage: item.url })}
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
        <div className="acp-field">
          <label className="acp-label">SEO Title</label>
          <input className="acp-input" value={form.seo?.metaTitle ?? ""}
            onChange={(e) => set({ seo: { ...form.seo, metaTitle: e.target.value } })} />
        </div>
        <div className="acp-field acp-field-checks">
          <label className="acp-label">Flags</label>
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
      </div>

      <div className="acp-rules-section">
        <div className="acp-rules-header">
          <span className="acp-label">Matching Rules</span>
          <div className="acp-rules-match">
            <label className="acp-check">
              <input type="radio" name="match" value="any"
                checked={(form.conditions?.match ?? "any") === "any"}
                onChange={() => set({ conditions: { ...(form.conditions ?? { rules: [] }), match: "any" } })} />
              Match ANY rule (OR)
            </label>
            <label className="acp-check">
              <input type="radio" name="match" value="all"
                checked={form.conditions?.match === "all"}
                onChange={() => set({ conditions: { ...(form.conditions ?? { rules: [] }), match: "all" } })} />
              Match ALL rules (AND)
            </label>
          </div>
        </div>
        {(form.conditions?.rules ?? []).map((rule, i) => (
          <RuleEditor key={i} rule={rule} index={i}
            onChange={(r) => setRule(i, r)} onRemove={() => removeRule(i)} />
        ))}
        <button className="acp-btn acp-btn-secondary" onClick={addRule}>+ Add Rule</button>
      </div>

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

// ── Main panel ────────────────────────────────────────────────────────────────

type AdminCollectionsPanelProps = {
  initialCollections?: Collection[];
};

export default function AdminCollectionsPanel({
  initialCollections,
}: AdminCollectionsPanelProps = {}) {
  const hasInitialProps = initialCollections !== undefined;
  const [tab, setTab] = useState<AdminCollectionTabId>("collections");
  const [collections, setCollections] = useState<Collection[]>(initialCollections ?? []);
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
  const [formSaving, setFormSaving] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collectionFormRef = useRef<CollectionFormHandle>(null);
  const formSubmitRef = useRef<((mode: CollectionSaveMode) => Promise<void>) | null>(null);

  const registerFormSubmit = useCallback(
    (submit: ((mode: CollectionSaveMode) => Promise<void>) | null) => {
      formSubmitRef.current = submit;
    },
    [],
  );

  const markSaved = useAdminUiStore((s) => s.markSaved);

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
      const res = await fetch("/api/collections", API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { collections: Collection[] };
      setCollections(data.collections ?? []);
    } catch (e) {
      if (!options?.silent) {
        setGlobalError(e instanceof Error ? e.message : "Failed to load collections");
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
      const res = await fetch("/api/sync-collections?loadReport=1", API);
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
      const res = await fetch("/api/sync-collections", API);
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

  const runSync = useCallback(async (autoCreate = false) => {
    setSyncing(true);
    setGlobalError(null);
    try {
      const res = await fetch("/api/sync-collections", {
        ...API,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoCreate }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { report: SyncReport };
      setReport(data.report);
      setTab("sync");
      if (data.report.newCollectionsCreated > 0) await fetchCollections();
      const parts: string[] = ["Sync complete"];
      if (data.report.newCollectionsCreated > 0) {
        parts.push(`${data.report.newCollectionsCreated} new collection(s) created`);
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

  /** Patch local table state after a save — avoids a full list refetch. */
  const updateCollectionsAfterSave = useCallback((
    saved: Collection,
    options?: { priorSlug?: string; reparentFromSlug?: string },
  ) => {
    setCollections((prev) => {
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
    });
  }, []);

  const removeCollectionFromList = useCallback((slug: string) => {
    setCollections((prev) => prev.filter((c) => c.slug !== slug && c.id !== slug));
  }, []);

  const handleSave = useCallback(async (data: Partial<Collection>, mode: CollectionSaveMode) => {
    const isNew = editTarget === "new";
    const payloadData =
      mode === "publish" ? { ...data, visible: true } : data;
    const payload = isNew
      ? payloadData
      : { ...payloadData, originalSlug: (editTarget as Collection).slug };
    const res = await fetch("/api/collections", {
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
      save: isNew ? "Collection created" : "Collection saved",
      update: "Collection updated",
      publish: "Collection published",
    };
    let msg = messages[mode];
    if ((json.reparentedChildren ?? 0) > 0) {
      msg += ` — ${json.reparentedChildren} child collection(s) updated`;
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
        const msg = "Collection form is not ready";
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

  const collectionPageActions = useMemo((): PageActions => {
    if (editTarget) {
      return {
        onCancel: handleCancelEdit,
        canCancel: !formSaving,
      };
    }
    return {
      onSave: () => runValidate(),
      onUpdate: () => runSync(false),
      onPublish: () => runSync(true),
      saveLabel: "Validate",
      updateLabel: "Sync",
      publishLabel: "Sync + Create",
      saveTooltip: "Preview collection rule matches — no writes",
      updateTooltip: "Rebuild product indexes from collection rules",
      publishTooltip: "Sync, auto-create missing collections, and rebuild indexes",
      markSavedOnSaveSuccess: false,
      canSave: !syncing,
      canUpdate: !syncing,
      canPublish: !syncing,
    };
  }, [editTarget, formSaving, handleCancelEdit, syncing, runValidate, runSync]);

  useAdminFormState(collectionPageActions);

  const handleDelete = useCallback(async (collection: Collection) => {
    if (!window.confirm(`Delete collection "${collection.name}"? This cannot be undone.`)) return;

    const previous = collections;
    setDeleteProgress({ current: 0, total: 1, label: "Deleting 1 of 1" });
    removeCollectionFromList(collection.slug);
    if (collectionScope === collection.slug) setCollectionScope(null);
    if (editTarget && editTarget !== "new" && (editTarget as Collection).slug === collection.slug) {
      setEditTarget(null);
    }

    try {
      const res = await fetch("/api/collections", {
        ...API,
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: collection.slug }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok || json.error) {
        setCollections(previous);
        setGlobalError(json.error ?? "Delete failed");
        return;
      }
      void fetchSyncReport();
      showSuccess(`Collection "${collection.name}" deleted`);
    } catch (e) {
      setCollections(previous);
      setGlobalError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteProgress(null);
    }
  }, [collectionScope, collections, editTarget, fetchSyncReport, removeCollectionFromList]);

  // ── Inline edit save ──────────────────────────────────────────────────────

  const handleInlineEdit = useCallback(async (save: InlineEditSave<Collection>): Promise<Collection> => {
    const { row, colKey, newValue } = save;
    const payload: Partial<Collection> & { originalSlug: string } = {
      slug: row.slug,
      originalSlug: row.slug,
    };

    if (colKey === "name") payload.name = String(newValue);
    else if (colKey === "slug") {
      payload.slug = String(newValue).toLowerCase().replace(/[^a-z0-9-]/g, "-");
    } else if (colKey === "visible") payload.visible = Boolean(newValue);
    else if (colKey === "parentSlug") {
      payload.parentSlug = newValue ? String(newValue) : undefined;
    }

    const res = await fetch("/api/collections", {
      ...API,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as {
      collection?: Collection;
      reparentedChildren?: number;
      error?: string;
    };
    if (!res.ok || json.error) throw new Error(json.error ?? "Save failed");

    if (json.collection) {
      const slugRenamed = colKey === "slug" && row.slug !== json.collection.slug;
      updateCollectionsAfterSave(json.collection, {
        priorSlug: slugRenamed ? row.slug : undefined,
        reparentFromSlug: slugRenamed ? row.slug : undefined,
      });
    }

    void fetchSyncReport();
    return json.collection ?? row;
  }, [fetchSyncReport, updateCollectionsAfterSave]);

  // ── Bulk delete ───────────────────────────────────────────────────────────

  const handleBulkDelete = useCallback(async (rows: Collection[]) => {
    const selectedSlugs = new Set(rows.map((r) => r.slug));
    const remaining = collections.filter((c) => !selectedSlugs.has(c.slug));
    const blocked = rows
      .map((row) => ({
        row,
        children: remaining.filter((c) => (c.parentSlug ?? "").trim() === row.slug),
      }))
      .filter(({ children }) => children.length > 0);

    if (blocked.length > 0) {
      const detail = blocked
        .map(
          ({ row, children }) =>
            `"${row.name}" has ${children.length} child collection(s): ${children.map((c) => c.slug).join(", ")}`,
        )
        .join("; ");
      throw new Error(`Cannot delete: ${detail}. Delete child collections first.`);
    }

    setDeleteProgress({ current: 0, total: rows.length, label: "Deleting…" });
    const failures: { slug: string; error: string }[] = [];
    const deletedSlugs = new Set<string>();

    try {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        setDeleteProgress({
          current: i,
          total: rows.length,
          label: `Deleting ${i + 1} of ${rows.length}`,
        });
        const res = await fetch("/api/collections", {
          ...API,
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: row.slug }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok || json.error) {
          failures.push({ slug: row.slug, error: json.error ?? `HTTP ${res.status}` });
        } else {
          deletedSlugs.add(row.slug);
        }
      }

      if (deletedSlugs.size > 0) {
        setCollections((prev) => prev.filter((c) => !deletedSlugs.has(c.slug)));
        if (collectionScope && deletedSlugs.has(collectionScope)) setCollectionScope(null);
      }

      if (failures.length > 0) {
        const succeeded = rows.length - failures.length;
        throw new Error(
          `Deleted ${succeeded} of ${rows.length} (${failures.length} failed): ${failures[0]!.error}`,
        );
      }

      void fetchSyncReport();
    } finally {
      setDeleteProgress(null);
    }
  }, [collectionScope, collections, fetchSyncReport]);

  // ── Bulk actions ──────────────────────────────────────────────────────────

  const bulkActions: BulkAction<Collection>[] = useMemo(() => [
    {
      key: "hide",
      label: "Hide",
      variant: "secondary",
      handler: async (selected, clearSelection) => {
        for (const col of selected) {
          await fetch("/api/collections", {
            ...API,
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...col, visible: false, originalSlug: col.slug }),
          });
        }
        clearSelection();
        await fetchCollections();
      },
    },
    {
      key: "show",
      label: "Show",
      variant: "secondary",
      handler: async (selected, clearSelection) => {
        for (const col of selected) {
          await fetch("/api/collections", {
            ...API,
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...col, visible: true, originalSlug: col.slug }),
          });
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

  const collectionTabs = useMemo(() => {
    return ADMIN_COLLECTION_TABS.map((t) => {
      if (t.id === "orphans" && orphanProducts.length > 0) {
        return { ...t, label: `Orphans (${orphanProducts.length})` };
      }
      if (t.id === "warnings" && report && report.warnings.length > 0) {
        return { ...t, label: `Warnings (${report.warnings.length})` };
      }
      return t;
    });
  }, [orphanProducts.length, report]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {report && (
            <p className="text-sm text-muted-foreground">
              {report.totalCollections} collections · {report.totalProducts} products
              {report.orphanProducts > 0 && (
                <span className="text-amber-600 dark:text-amber-400"> · {report.orphanProducts} orphans</span>
              )}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => exportCollections(collections)}
            disabled={!collections.length || !!deleteProgress}
          >
            Export all
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
          <Button
            type="button"
            size="sm"
            onClick={openNewCollection}
            disabled={!!deleteProgress}
          >
            New collection
          </Button>
        </div>
      </div>

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
            `Imported ${summary.aggregate.created} new, updated ${summary.aggregate.updated} collection(s)`,
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
          <DataTable<Collection>
            id="admin-collections"
            data={filteredCollections}
            columns={columns}
            filters={COLLECTION_FILTERS}
            bulkActions={bulkActions}
            getRowKey={(col) => col.slug}
            onInlineEdit={handleInlineEdit}
            onBulkDelete={handleBulkDelete}
            loading={loading}
            emptyMessage="No collections found. Create a new collection."
            searchFields={["name", "slug", "description", "parentSlug", "badge"]}
            onRowClick={openCollectionEdit}
            rowClassName={(col) => col.visible === false ? "acp-row--hidden" : ""}
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
            <div className="acp-empty">Run <strong>Validate</strong> or <strong>Sync Collections</strong> to generate a report.</div>
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
                <div className="acp-stat"><span className="acp-stat-val">{report.totalCollections}</span><span className="acp-stat-lbl">Collections</span></div>
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
                    label: "Collections",
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

      {panelTab === "orphans" && (
        <>
          {orphanProducts.length === 0 ? (
            <div className="acp-empty acp-empty--ok">
              {report ? "No orphan products — every product matches at least one collection." : "Run a sync to detect orphan products."}
            </div>
          ) : (
            <>
              <p className="acp-desc">
                These products do not match any collection. Run <strong>Sync + Auto-Create</strong> to generate missing collections automatically.
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
                emptyMessage="No orphan products."
                noVirtualize
              />
            </>
          )}
        </>
      )}

      {panelTab === "warnings" && (
        <>
          {!report ? (
            <div className="acp-empty">Run Validate or Sync to see warnings.</div>
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
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open && !formSaving) handleCancelEdit();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editTarget === "new"
                ? "New collection"
                : editTarget
                  ? `Edit: ${(editTarget as Collection).name}`
                  : "Collection"}
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
