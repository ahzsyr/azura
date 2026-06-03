// @ts-nocheck — ported Astro admin panel.
"use client";

/**
 * AdminCollectionsPanel — AZURA Admin Dashboard
 * Full collection management with DataTable engine, rule editor, hierarchy, sync report.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./AdminCollectionsPanel.css";
import {
  ADMIN_COLLECTION_TABS,
  readHashTab,
  type AdminCollectionTabId,
} from "@/features/catalog/admin/catalog-admin-tabs";
import { CatalogAdminShell } from "@/features/catalog/admin/catalog-admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/features/catalog/admin/shared/DataTable";
import type { BulkAction, ColumnDef, FilterDef, InlineEditSave } from "@/features/catalog/admin/shared/types";
import { MediaPickerButton } from "@/features/catalog/admin/media/MediaPicker";

// ── Types ─────────────────────────────────────────────────────────────────────

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

function CollectionForm({
  initial, collections, onSave, onCancel,
}: {
  initial: Partial<Collection>;
  collections: Collection[];
  onSave: (data: Partial<Collection>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<Collection>>(initial);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const set = (patch: Partial<Collection>) => setForm((prev) => ({ ...prev, ...patch }));

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

  const handleSubmit = async () => {
    if (!form.slug?.trim()) { setFormError("Slug is required"); return; }
    if (!form.name?.trim()) { setFormError("Name is required"); return; }
    setSaving(true);
    setFormError(null);
    try { await onSave(form); }
    catch (e) { setFormError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

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

      <div className="acp-form-actions">
        <button className="acp-btn acp-btn-primary" onClick={() => void handleSubmit()} disabled={saving}>
          {saving ? "Saving…" : "Save Collection"}
        </button>
        <button className="acp-btn acp-btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

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
  const [tab, setTab] = useState<AdminCollectionTabId>(() =>
    readHashTab(ADMIN_COLLECTION_TABS, "collections"),
  );
  const [collections, setCollections] = useState<Collection[]>(initialCollections ?? []);
  const [loading, setLoading] = useState(!initialCollections?.length);
  const [syncing, setSyncing] = useState(false);
  const [report, setReport] = useState<SyncReport | null>(null);
  const [editTarget, setEditTarget] = useState<Collection | "new" | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    if (successTimer.current) clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => setSuccessMsg(null), 3500);
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    setGlobalError(null);
    try {
      const res = await fetch("/api/collections", API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { collections: Collection[] };
      setCollections(data.collections ?? []);
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : "Failed to load collections");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchCollections(); }, [fetchCollections]);

  // ── Sync ──────────────────────────────────────────────────────────────────

  const runValidate = async () => {
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
      setGlobalError(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setSyncing(false);
    }
  };

  const runSync = async (autoCreate = false) => {
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
      showSuccess(
        autoCreate && data.report.newCollectionsCreated > 0
          ? `Sync complete — ${data.report.newCollectionsCreated} new collection(s) created`
          : "Sync complete",
      );
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const handleSave = async (data: Partial<Collection>) => {
    const isNew = editTarget === "new";
    const payload = isNew ? data : { ...data, originalSlug: (editTarget as Collection).slug };
    const res = await fetch("/api/collections", {
      ...API,
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { collection?: Collection; error?: string };
    if (!res.ok || json.error) throw new Error(json.error ?? "Save failed");
    await fetchCollections();
    setEditTarget(null);
    showSuccess(isNew ? "Collection created" : "Collection updated");
  };

  const handleDelete = async (collection: Collection) => {
    if (!window.confirm(`Delete collection "${collection.name}"? This cannot be undone.`)) return;
    const res = await fetch("/api/collections", {
      ...API,
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: collection.slug }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok || json.error) { setGlobalError(json.error ?? "Delete failed"); return; }
    await fetchCollections();
    showSuccess(`Collection "${collection.name}" deleted`);
  };

  // ── Inline edit save ──────────────────────────────────────────────────────

  const handleInlineEdit = useCallback(async (save: InlineEditSave<Collection>): Promise<Collection> => {
    const { row, colKey, newValue } = save;
    const updated: Partial<Collection> = { ...row };

    if (colKey === "name") updated.name = String(newValue);
    else if (colKey === "slug") updated.slug = String(newValue).toLowerCase().replace(/[^a-z0-9-]/g, "-");
    else if (colKey === "visible") updated.visible = Boolean(newValue);

    const res = await fetch("/api/collections", {
      ...API,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updated, originalSlug: row.slug }),
    });
    const json = (await res.json()) as { collection?: Collection; error?: string };
    if (!res.ok || json.error) throw new Error(json.error ?? "Save failed");
    await fetchCollections();
    return json.collection ?? row;
  }, [fetchCollections]);

  // ── Bulk delete ───────────────────────────────────────────────────────────

  const handleBulkDelete = useCallback(async (rows: Collection[]) => {
    for (const row of rows) {
      await fetch("/api/collections", {
        ...API,
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: row.slug }),
      });
    }
    await fetchCollections();
  }, [fetchCollections]);

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
  ], [fetchCollections]);

  // ── Computed ──────────────────────────────────────────────────────────────

  const hierarchyTree = useMemo(() => buildHierarchyTree(collections), [collections]);
  const orphanProducts = useMemo(() => (report?.productStatuses ?? []).filter((p) => p.isOrphan), [report]);
  const warningsByCode = useMemo(() => {
    if (!report) return {};
    const map: Record<string, ValidationWarning[]> = {};
    for (const w of report.warnings) (map[w.code] ??= []).push(w);
    return map;
  }, [report]);
  const counts = report?.collectionCounts ?? {};

  const columns = useMemo(
    () => makeCollectionColumns(counts, setEditTarget, handleDelete),
    [counts],
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
          <Button type="button" variant="ghost" size="sm" onClick={() => void runValidate()} disabled={syncing}>
            {syncing ? "…" : "Validate"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void runSync(false)} disabled={syncing}>
            {syncing ? "Syncing…" : "Sync Collections"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void runSync(true)} disabled={syncing}>
            Sync + Auto-Create
          </Button>
          <Button type="button" size="sm" onClick={() => setEditTarget("new")}>
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

      {editTarget ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {editTarget === "new" ? "New collection" : `Edit: ${(editTarget as Collection).name}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CollectionForm
              initial={editTarget === "new" ? emptyCollection() : { ...(editTarget as Collection) }}
              collections={collections}
              onSave={handleSave}
              onCancel={() => setEditTarget(null)}
            />
          </CardContent>
        </Card>
      ) : (
        <CatalogAdminShell tabs={collectionTabs} activeTab={tab} onTabChange={setTab}>
          {(panelTab) => (
            <>
      {panelTab === "collections" && (
          <DataTable<Collection>
            id="admin-collections"
            data={collections}
            columns={columns}
            filters={COLLECTION_FILTERS}
            bulkActions={bulkActions}
            getRowKey={(col) => col.slug}
            onInlineEdit={handleInlineEdit}
            onBulkDelete={handleBulkDelete}
            loading={loading}
            emptyMessage="No collections found. Create a new collection."
            searchFields={["name", "slug", "description", "parentSlug", "badge"]}
            onRowClick={(col) => setEditTarget(col)}
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
                onEdit={() => { setEditTarget(collection); setTab("collections"); }}
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
      )}
    </div>
  );
}
