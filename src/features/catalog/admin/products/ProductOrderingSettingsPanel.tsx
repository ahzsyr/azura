"use client";

import type { ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLACEHOLDER_IMAGE_PATH } from "@/features/media/constants";
import type { ProductSummary } from "@/features/products/types";
import {
  applyProductOrdering,
  createEmptyProfile,
  PRODUCT_ORDERING_DEFAULT_SORT_LABELS,
  PRODUCT_ORDERING_DEFAULT_SORTS,
  PRODUCT_ORDERING_KEYWORD_FIELD_LABELS,
  PRODUCT_ORDERING_KEYWORD_FIELDS,
  PRODUCT_ORDERING_RULE_LABELS,
  PRODUCT_ORDERING_SCOPE_TYPES,
  type OrderableListingRecord,
  type ProductOrderingDefaultSort,
  type ProductOrderingKeywordField,
  type ProductOrderingProfile,
  type ProductOrderingRuleId,
  type ProductOrderingScopeType,
  type ProductOrderingSettings,
} from "@/features/products/ordering";
import "./ProductOrderingSettingsPanel.css";

type CategoryOption = { id: string; slug: string; name: string };

type Props = {
  settings: ProductOrderingSettings;
  setSettings: (next: ProductOrderingSettings | ((prev: ProductOrderingSettings) => ProductOrderingSettings)) => void;
  products: ProductSummary[];
  brands: string[];
  categories: CategoryOption[];
  onDirty?: () => void;
};

const SCOPE_LABELS: Record<ProductOrderingScopeType, string> = {
  GLOBAL: "Global",
  PRODUCT_LIST: "Product List",
  BRAND: "Brand",
  CATEGORY: "Category",
  COLLECTION: "Collection",
  SEARCH: "Search",
};

function scopeNeedsTarget(type: ProductOrderingScopeType): boolean {
  return type === "BRAND" || type === "CATEGORY" || type === "COLLECTION";
}

function summaryToRecord(p: ProductSummary): OrderableListingRecord {
  return {
    slug: p.slug,
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    categories: p.categories?.length ? p.categories : p.category ? [p.category] : [],
    tags: [],
    price: p.price,
    old_price: p.old_price,
    priceMin: p.price?.value ?? 0,
    priceMax: p.price?.value ?? 0,
    short_description: p.short_description,
    mpn: p.mpn,
    rating: p.rating,
    reviews_count: p.reviews_count,
    primary_image: p.primary_image,
    secondary_image: p.secondary_image,
    in_stock: p.in_stock !== false,
    conditions: [],
    variationFacets: {},
    collectionSlugs: [],
    searchText: [p.name, p.brand, p.mpn, p.short_description].filter(Boolean).join(" "),
  };
}

function SortableRow({
  id,
  label,
  subtitle,
  onRemove,
  children,
}: {
  id: string;
  label: string;
  subtitle?: string;
  onRemove?: () => void;
  children?: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("po-sortable-row", isDragging && "po-sortable-row--dragging")}
    >
      <button
        type="button"
        className="po-sortable-row__grip"
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${label}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="po-sortable-row__body">
        <div className="po-sortable-row__label">{label}</div>
        {subtitle ? <div className="po-sortable-row__sub">{subtitle}</div> : null}
        {children}
      </div>
      {onRemove ? (
        <button type="button" className="po-sortable-row__remove" onClick={onRemove} aria-label={`Remove ${label}`}>
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

export function ProductOrderingSettingsPanel({
  settings,
  setSettings,
  products,
  brands,
  categories,
  onDirty,
}: Props) {
  const [activeProfileId, setActiveProfileId] = useState(
    () => settings.profiles.find((p) => p.scope.type === "GLOBAL")?.id ?? settings.profiles[0]?.id ?? "",
  );
  const [brandToAdd, setBrandToAdd] = useState("");
  const [categoryToAdd, setCategoryToAdd] = useState("");
  const [productToAdd, setProductToAdd] = useState("");
  const [keywordDraft, setKeywordDraft] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const profile = settings.profiles.find((p) => p.id === activeProfileId) ?? settings.profiles[0];

  const patchSettings = (fn: (prev: ProductOrderingSettings) => ProductOrderingSettings) => {
    setSettings(fn);
    onDirty?.();
  };

  const updateProfile = (patch: Partial<ProductOrderingProfile> | ((p: ProductOrderingProfile) => ProductOrderingProfile)) => {
    if (!profile) return;
    patchSettings((prev) => ({
      profiles: prev.profiles.map((p) => {
        if (p.id !== profile.id) return p;
        return typeof patch === "function" ? patch(p) : { ...p, ...patch };
      }),
    }));
  };

  const previewRecords = useMemo(() => {
    if (!profile) return [];
    let pool = products.map(summaryToRecord);
    if (profile.scope.type === "BRAND" && profile.scope.targetId) {
      const t = profile.scope.targetId.toLowerCase();
      pool = pool.filter((r) => (r.brand ?? "").toLowerCase() === t);
    } else if (
      (profile.scope.type === "CATEGORY" || profile.scope.type === "COLLECTION") &&
      profile.scope.targetId
    ) {
      const t = profile.scope.targetId.toLowerCase();
      pool = pool.filter(
        (r) =>
          (r.category ?? "").toLowerCase() === t ||
          r.categories.some((c) => c.toLowerCase() === t) ||
          r.collectionSlugs.some((c) => c.toLowerCase() === t),
      );
    }
    return applyProductOrdering(pool, profile).slice(0, 24);
  }, [products, profile]);

  if (!profile) {
    return (
      <section className="apm-dashboard-card">
        <p>No ordering profiles available.</p>
      </section>
    );
  }

  const onRuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const order = profile.ruleOrder;
    const oldIndex = order.indexOf(active.id as ProductOrderingRuleId);
    const newIndex = order.indexOf(over.id as ProductOrderingRuleId);
    if (oldIndex < 0 || newIndex < 0) return;
    updateProfile({ ruleOrder: arrayMove(order, oldIndex, newIndex) });
  };

  const makeListDragEnd =
    (listKey: "brandPriority" | "categoryPriority" | "pinnedProductSlugs") =>
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const list = profile[listKey];
      const oldIndex = list.indexOf(String(active.id));
      const newIndex = list.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      updateProfile({ [listKey]: arrayMove(list, oldIndex, newIndex) });
    };

  const onKeywordDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const list = profile.keywordPriority;
    const oldIndex = list.findIndex((k) => k.id === active.id);
    const newIndex = list.findIndex((k) => k.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    updateProfile({ keywordPriority: arrayMove(list, oldIndex, newIndex) });
  };

  const addProfile = () => {
    const next = createEmptyProfile({ name: "New Ordering Profile", scope: { type: "PRODUCT_LIST" } });
    patchSettings((prev) => ({ profiles: [...prev.profiles, next] }));
    setActiveProfileId(next.id);
  };

  const deleteProfile = () => {
    if (profile.scope.type === "GLOBAL") return;
    patchSettings((prev) => {
      const profiles = prev.profiles.filter((p) => p.id !== profile.id);
      return { profiles: profiles.length ? profiles : prev.profiles };
    });
    const fallback = settings.profiles.find((p) => p.id !== profile.id && p.scope.type === "GLOBAL");
    setActiveProfileId(fallback?.id ?? settings.profiles.find((p) => p.id !== profile.id)?.id ?? "");
  };

  const availableBrands = brands.filter(
    (b) => !profile.brandPriority.some((x) => x.toLowerCase() === b.toLowerCase()),
  );
  const availableCategories = categories.filter(
    (c) => !profile.categoryPriority.some((x) => x.toLowerCase() === c.slug.toLowerCase()),
  );
  const availableProducts = products.filter(
    (p) => !profile.pinnedProductSlugs.some((s) => s.toLowerCase() === p.slug.toLowerCase()),
  );

  const productNameBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) map.set(p.slug.toLowerCase(), p.name);
    return map;
  }, [products]);

  const categoryLabelBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.slug.toLowerCase(), c.name);
    return map;
  }, [categories]);

  return (
    <section className="apm-dashboard-card apm-products-settings po-panel" aria-labelledby="po-panel-h">
      <header className="apm-dashboard-card__head">
        <h2 id="po-panel-h" className="apm-dashboard-card__title">
          Product Ordering
        </h2>
        <p className="apm-dashboard-card__lede">
          Control how products are prioritized across listings. Priority rules push matches to the top;
          Default Sort still applies inside each bucket. Save from the top bar.
        </p>
      </header>

      <div className="po-layout">
        <div className="po-layout__main">
          <div className="po-profile-bar">
            <label className="po-field po-field--grow">
              <span>Profile</span>
              <select
                value={profile.id}
                onChange={(e) => setActiveProfileId(e.target.value)}
              >
                {settings.profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.enabled ? "" : " (disabled)"}
                    {` — ${SCOPE_LABELS[p.scope.type]}`}
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" variant="outline" size="sm" onClick={addProfile}>
              <Plus className="h-4 w-4" /> New Profile
            </Button>
          </div>

          <div className="po-section">
            <h3 className="po-section__title">Profile settings</h3>
            <div className="po-grid">
              <label className="po-field">
                <span>Profile Name</span>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => updateProfile({ name: e.target.value })}
                />
              </label>
              <label className="po-field po-field--toggle">
                <span>Enabled</span>
                <input
                  type="checkbox"
                  checked={profile.enabled}
                  onChange={(e) => updateProfile({ enabled: e.target.checked })}
                />
              </label>
              <label className="po-field">
                <span>Scope</span>
                <select
                  value={profile.scope.type}
                  disabled={profile.scope.type === "GLOBAL"}
                  onChange={(e) => {
                    const type = e.target.value as ProductOrderingScopeType;
                    if (type === "GLOBAL") return;
                    updateProfile({
                      scope: scopeNeedsTarget(type)
                        ? { type, targetId: profile.scope.targetId }
                        : { type },
                    });
                  }}
                >
                  {PRODUCT_ORDERING_SCOPE_TYPES.map((t) => (
                    <option key={t} value={t} disabled={t === "GLOBAL" && profile.scope.type !== "GLOBAL"}>
                      {SCOPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </label>
              {scopeNeedsTarget(profile.scope.type) ? (
                <label className="po-field">
                  <span>
                    {profile.scope.type === "BRAND"
                      ? "Target Brand"
                      : profile.scope.type === "COLLECTION"
                        ? "Target Collection"
                        : "Target Category"}
                  </span>
                  {profile.scope.type === "BRAND" ? (
                    <select
                      value={profile.scope.targetId ?? ""}
                      onChange={(e) =>
                        updateProfile({ scope: { type: "BRAND", targetId: e.target.value || undefined } })
                      }
                    >
                      <option value="">Select brand…</option>
                      {brands.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={profile.scope.targetId ?? ""}
                      onChange={(e) =>
                        updateProfile({
                          scope: {
                            type: profile.scope.type as "CATEGORY" | "COLLECTION",
                            targetId: e.target.value || undefined,
                          },
                        })
                      }
                    >
                      <option value="">Select…</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
              ) : null}
              <label className="po-field">
                <span>Default Sort</span>
                <select
                  value={profile.defaultSort}
                  onChange={(e) =>
                    updateProfile({ defaultSort: e.target.value as ProductOrderingDefaultSort })
                  }
                >
                  {PRODUCT_ORDERING_DEFAULT_SORTS.map((s) => (
                    <option key={s} value={s}>
                      {PRODUCT_ORDERING_DEFAULT_SORT_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {profile.scope.type !== "GLOBAL" ? (
              <div className="po-danger-row">
                <Button type="button" variant="ghost" size="sm" onClick={deleteProfile}>
                  Delete profile
                </Button>
              </div>
            ) : null}
          </div>

          <div className="po-section">
            <h3 className="po-section__title">Priority Rules</h3>
            <p className="po-section__hint">Drag to determine which rule wins. First matching rule assigns the bucket.</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onRuleDragEnd}>
              <SortableContext items={profile.ruleOrder} strategy={verticalListSortingStrategy}>
                <div className="po-stack">
                  {profile.ruleOrder.map((rule) => (
                    <SortableRow key={rule} id={rule} label={PRODUCT_ORDERING_RULE_LABELS[rule]} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <div className="po-section">
            <h3 className="po-section__title">Specific Products</h3>
            <p className="po-section__hint">Products appearing here will be pushed to the top.</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeListDragEnd("pinnedProductSlugs")}>
              <SortableContext items={profile.pinnedProductSlugs} strategy={verticalListSortingStrategy}>
                <div className="po-stack">
                  {profile.pinnedProductSlugs.map((slug) => (
                    <SortableRow
                      key={slug}
                      id={slug}
                      label={productNameBySlug.get(slug.toLowerCase()) ?? slug}
                      subtitle={slug}
                      onRemove={() =>
                        updateProfile({
                          pinnedProductSlugs: profile.pinnedProductSlugs.filter((s) => s !== slug),
                        })
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <div className="po-add-row">
              <select value={productToAdd} onChange={(e) => setProductToAdd(e.target.value)}>
                <option value="">Select product…</option>
                {availableProducts.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!productToAdd}
                onClick={() => {
                  if (!productToAdd) return;
                  updateProfile({ pinnedProductSlugs: [...profile.pinnedProductSlugs, productToAdd] });
                  setProductToAdd("");
                }}
              >
                + Add Product
              </Button>
            </div>
          </div>

          <div className="po-section">
            <h3 className="po-section__title">Brand Priority</h3>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeListDragEnd("brandPriority")}>
              <SortableContext items={profile.brandPriority} strategy={verticalListSortingStrategy}>
                <div className="po-stack">
                  {profile.brandPriority.map((brand) => (
                    <SortableRow
                      key={brand}
                      id={brand}
                      label={brand}
                      onRemove={() =>
                        updateProfile({
                          brandPriority: profile.brandPriority.filter((b) => b !== brand),
                        })
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <div className="po-add-row">
              <select value={brandToAdd} onChange={(e) => setBrandToAdd(e.target.value)}>
                <option value="">Select brand…</option>
                {availableBrands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!brandToAdd}
                onClick={() => {
                  if (!brandToAdd) return;
                  updateProfile({ brandPriority: [...profile.brandPriority, brandToAdd] });
                  setBrandToAdd("");
                }}
              >
                + Add Brand
              </Button>
            </div>
          </div>

          <div className="po-section">
            <h3 className="po-section__title">Category Priority</h3>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeListDragEnd("categoryPriority")}>
              <SortableContext items={profile.categoryPriority} strategy={verticalListSortingStrategy}>
                <div className="po-stack">
                  {profile.categoryPriority.map((slug) => (
                    <SortableRow
                      key={slug}
                      id={slug}
                      label={categoryLabelBySlug.get(slug.toLowerCase()) ?? slug}
                      subtitle={slug}
                      onRemove={() =>
                        updateProfile({
                          categoryPriority: profile.categoryPriority.filter((c) => c !== slug),
                        })
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <div className="po-add-row">
              <select value={categoryToAdd} onChange={(e) => setCategoryToAdd(e.target.value)}>
                <option value="">Select category…</option>
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!categoryToAdd}
                onClick={() => {
                  if (!categoryToAdd) return;
                  updateProfile({ categoryPriority: [...profile.categoryPriority, categoryToAdd] });
                  setCategoryToAdd("");
                }}
              >
                + Add Category
              </Button>
            </div>
          </div>

          <div className="po-section">
            <h3 className="po-section__title">Keyword Priority</h3>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onKeywordDragEnd}>
              <SortableContext
                items={profile.keywordPriority.map((k) => k.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="po-stack">
                  {profile.keywordPriority.map((entry) => (
                    <SortableRow
                      key={entry.id}
                      id={entry.id}
                      label={`"${entry.keyword}"`}
                      onRemove={() =>
                        updateProfile({
                          keywordPriority: profile.keywordPriority.filter((k) => k.id !== entry.id),
                        })
                      }
                    >
                      <div className="po-keyword-fields" role="group" aria-label="Match fields">
                        <span className="po-keyword-fields__label">Match:</span>
                        {PRODUCT_ORDERING_KEYWORD_FIELDS.map((field) => {
                          const checked = entry.fields.includes(field);
                          return (
                            <label key={field} className="po-keyword-fields__item">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const nextFields: ProductOrderingKeywordField[] = checked
                                    ? entry.fields.filter((f) => f !== field)
                                    : [...entry.fields, field];
                                  updateProfile({
                                    keywordPriority: profile.keywordPriority.map((k) =>
                                      k.id === entry.id
                                        ? {
                                            ...k,
                                            fields:
                                              nextFields.length > 0
                                                ? nextFields
                                                : [...PRODUCT_ORDERING_KEYWORD_FIELDS],
                                          }
                                        : k,
                                    ),
                                  });
                                }}
                              />
                              {PRODUCT_ORDERING_KEYWORD_FIELD_LABELS[field]}
                            </label>
                          );
                        })}
                      </div>
                    </SortableRow>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <div className="po-add-row">
              <input
                type="text"
                value={keywordDraft}
                placeholder='e.g. vitamin c'
                onChange={(e) => setKeywordDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const keyword = keywordDraft.trim();
                  if (!keyword) return;
                  updateProfile((p) => ({
                    ...p,
                    keywordPriority: [
                      ...p.keywordPriority,
                      {
                        id: `kw_${Date.now().toString(36)}`,
                        keyword,
                        fields: [...PRODUCT_ORDERING_KEYWORD_FIELDS],
                      },
                    ],
                  }));
                  setKeywordDraft("");
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!keywordDraft.trim()}
                onClick={() => {
                  const keyword = keywordDraft.trim();
                  if (!keyword) return;
                  updateProfile((p) => ({
                    ...p,
                    keywordPriority: [
                      ...p.keywordPriority,
                      {
                        id: `kw_${Date.now().toString(36)}`,
                        keyword,
                        fields: [...PRODUCT_ORDERING_KEYWORD_FIELDS],
                      },
                    ],
                  }));
                  setKeywordDraft("");
                }}
              >
                + Add Keyword
              </Button>
            </div>
          </div>
        </div>

        <aside className="po-layout__preview" aria-label="Live preview">
          <div className="po-preview">
            <h3 className="po-preview__title">Live Preview</h3>
            <p className="po-preview__hint">
              Resulting order for {SCOPE_LABELS[profile.scope.type]}
              {profile.scope.targetId ? ` · ${profile.scope.targetId}` : ""}
            </p>
            {previewRecords.length === 0 ? (
              <p className="po-preview__empty">No products to preview for this scope.</p>
            ) : (
              <ol className="po-preview__list">
                {previewRecords.map((r, i) => (
                  <li key={r.slug} className="po-preview__item">
                    <span className="po-preview__pos">{i + 1}</span>
                    <img
                      src={r.primary_image || PLACEHOLDER_IMAGE_PATH}
                      alt=""
                      className="po-preview__thumb"
                      width={40}
                      height={40}
                    />
                    <div className="po-preview__meta">
                      <div className="po-preview__name">{r.name}</div>
                      <div className="po-preview__brand">{r.brand || "—"}</div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
