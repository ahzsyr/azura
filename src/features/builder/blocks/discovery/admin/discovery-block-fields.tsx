"use client";

import { useState } from "react";
import type { BlockNode, BlockType, ContentTypeOption } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LocalizedBlockInput,
  LocalizedBlockTextarea,
  LocalizedBlockTitle,
} from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { ProductCardDisplayOverrideFields } from "@/features/builder/blocks/commerce/product-blocks/admin/product-card-display-override-fields";
import { SearchEntityType } from "@prisma/client";
import { ModalRepeatableListEditor } from "@/features/builder/admin/shared/modal-repeatable-list-editor";
import { newId } from "@/features/builder/blocks/content/schemas/content-blocks";
import type { ManualCategoryNode } from "@/features/builder/blocks/discovery/schemas/discovery-blocks";
import type { CardVariant } from "@/schemas/content/display-settings";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

function TaxonomyMultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const allOptions = [...options];
  for (const selected of value) {
    if (!allOptions.some((option) => option.value === selected)) {
      allOptions.unshift({ value: selected, label: `${selected} (custom)` });
    }
  }
  const filtered = allOptions.filter((option) =>
    `${option.label} ${option.value}`.toLowerCase().includes(normalizedQuery),
  );
  const toggle = (item: string) =>
    onChange(value.includes(item) ? value.filter((current) => current !== item) : [...value, item]);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="search"
        placeholder={placeholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || !query.trim()) return;
          event.preventDefault();
          const item = query.trim();
          if (!value.includes(item)) onChange([...value, item]);
          setQuery("");
        }}
      />
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {value.map((item) => (
            <button key={item} type="button" className="rounded-md border bg-muted/40 px-2 py-0.5 text-xs" onClick={() => toggle(item)}>
              {allOptions.find((option) => option.value === item)?.label ?? item} <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="max-h-36 overflow-y-auto rounded-md border divide-y text-sm" role="group" aria-label={label}>
        {filtered.length ? filtered.map((option) => (
          <label key={option.value} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/30">
            <input type="checkbox" checked={value.includes(option.value)} onChange={() => toggle(option.value)} />
            <span className="truncate">{option.label}</span>
          </label>
        )) : <p className="px-2 py-2 text-xs text-muted-foreground">No matches. Press Enter to add “{query}”.</p>}
      </div>
      <p className="text-xs text-muted-foreground">Select one or more values, or type a value and press Enter.</p>
    </div>
  );
}

function setProp(block: BlockNode, onChange: (b: BlockNode) => void, key: string, value: unknown) {
  onChange(patchBlockSettings(block, { [key]: value }));
}

const CARD_VARIANT_OPTIONS: { value: CardVariant; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "compact", label: "Compact" },
  { value: "minimal", label: "Minimal" },
  { value: "featured", label: "Featured" },
  { value: "modern-minimal", label: "Modern Minimal" },
  { value: "floating-premium", label: "Floating / Premium" },
  { value: "image-overlay", label: "Image Overlay" },
];

export function SearchBlockFields({ block, onChange }: Props) {
  return (
    <div className="space-y-4">
      <LocalizedBlockTitle block={block} />
      <div>
        <Label className="text-xs">Layout</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.layout as string) ?? "inline"}
          onChange={(e) => setProp(block, onChange, "layout", e.target.value)}
        >
          <option value="inline">Inline</option>
          <option value="hero">Hero</option>
          <option value="compact">Compact</option>
        </select>
      </div>
      <div>
        <Label className="text-xs">Results mode</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.resultsMode as string) ?? "dropdown"}
          onChange={(e) => setProp(block, onChange, "resultsMode", e.target.value)}
        >
          <option value="dropdown">Dropdown results</option>
          <option value="redirect">Redirect to search page</option>
        </select>
      </div>
      <Input
        placeholder="Redirect path (e.g. /search)"
        value={(block.props.redirectPath as string) ?? "/search"}
        onChange={(e) => setProp(block, onChange, "redirectPath", e.target.value)}
      />
    </div>
  );
}

export function AdvancedFiltersBlockFields({ block, onChange }: Props) {
  return (
    <div className="space-y-4">
      <LocalizedBlockTitle block={block} />
      <div>
        <Label className="text-xs">Scope</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.scope as string) ?? "products"}
          onChange={(e) => setProp(block, onChange, "scope", e.target.value)}
        >
          <option value="products">Product catalog</option>
          <option value="search">Global search</option>
          <option value="content">Content list</option>
        </select>
      </div>
      <div>
        <Label className="text-xs">Layout</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.layout as string) ?? "sidebar"}
          onChange={(e) => setProp(block, onChange, "layout", e.target.value)}
        >
          <option value="sidebar">Sidebar</option>
          <option value="chips">Chips</option>
          <option value="drawer">Drawer panel</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.syncUrl !== false}
          onChange={(e) => setProp(block, onChange, "syncUrl", e.target.checked)}
        />
        Sync filters to URL
      </label>
    </div>
  );
}

export function CategoryExplorerBlockFields({ block, onChange }: Props) {
  const rawSource = (block.props.source as string) ?? "categories";
  const source =
    rawSource === "collections" || rawSource === "productCategories" ? "categories" : rawSource;
  const scope = (block.props.scope as string) ?? "PRODUCT";
  const manualNodes = (block.props.manualNodes as ManualCategoryNode[]) ?? [];
  return (
    <div className="space-y-4">
      <LocalizedBlockTitle block={block} />
      <div>
        <Label className="text-xs">Taxonomy source</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={source}
          onChange={(e) => setProp(block, onChange, "source", e.target.value)}
        >
          <option value="categories">Categories</option>
          <option value="postCategories">Blog categories (legacy)</option>
          <option value="contentCollections">Content categories (legacy)</option>
          <option value="manual">Manual nodes</option>
        </select>
      </div>
      {source === "categories" && (
        <div>
          <Label className="text-xs">Scope</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={scope}
            onChange={(e) => setProp(block, onChange, "scope", e.target.value)}
          >
            <option value="PRODUCT">Product</option>
            <option value="POST">Post</option>
            <option value="CONTENT">Content</option>
          </select>
        </div>
      )}
      <div>
        <Label className="text-xs">Variant</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.variant as string) ?? "tabs"}
          onChange={(e) => setProp(block, onChange, "variant", e.target.value)}
        >
          <option value="tabs">Tabs</option>
          <option value="tree">Tree</option>
          <option value="sidebar">Sidebar</option>
          <option value="grid">Card grid</option>
        </select>
      </div>
      <Input
        placeholder="Content type slug (for content collections)"
        value={(block.props.contentTypeSlug as string) ?? ""}
        onChange={(e) => setProp(block, onChange, "contentTypeSlug", e.target.value)}
      />
      <div>
        <Label className="text-xs">Items per page</Label>
        <Input
          type="number"
          min={1}
          max={48}
          className="mt-1"
          value={String((block.props.pageSize as number) ?? 12)}
          onChange={(e) => setProp(block, onChange, "pageSize", Number(e.target.value))}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={(block.props.enablePagination as boolean) ?? true}
          onChange={(e) => setProp(block, onChange, "enablePagination", e.target.checked)}
        />
        Paginate when items exceed limit
      </label>
      <p className="text-xs text-muted-foreground">
        When pagination is off, only the first page of items is shown.
      </p>
      {source === "manual" ? (
        <ModalRepeatableListEditor
          items={manualNodes}
          onChange={(next) => setProp(block, onChange, "manualNodes", next)}
          createEmpty={() => ({ id: newId("node"), label: "", href: "", imageUrl: "", children: [] })}
          strings={{
            sectionLabel: "Manual nodes",
            addButtonLabel: "Add node",
            emptyLabel: "No manual nodes yet. Click Add node to create one.",
            dialogTitleCreate: "Add node",
            dialogTitleEdit: "Edit node",
            saveButtonLabelCreate: "Save node",
            saveButtonLabelEdit: "Save node",
          }}
          renderSummary={(node, index) => ({
            title: node.label || `Node ${index + 1}`,
            meta: node.href ? [`Href: ${node.href}`] : [],
          })}
          renderForm={(draft, onUpdate) => (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Label</Label>
                <Input className="mt-1" value={draft.label} onChange={(e) => onUpdate({ label: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Href</Label>
                <Input className="mt-1" value={draft.href} onChange={(e) => onUpdate({ href: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Image URL</Label>
                <Input className="mt-1" value={draft.imageUrl ?? ""} onChange={(e) => onUpdate({ imageUrl: e.target.value })} />
              </div>
            </div>
          )}
        />
      ) : null}
    </div>
  );
}

export function RelatedContentBlockFields({ block, onChange, contentTypeOptions = [] }: Props & { contentTypeOptions?: ContentTypeOption[] }) {
  const rule = (block.props.rule as string) ?? "taxonomy";
  const manualItems = (block.props.manualItems as { entityType?: SearchEntityType; entityId: string }[]) ?? [];
  const enabledContentTypes = contentTypeOptions.filter((type) => type.isEnabled !== false);
  const contentTypeSlug = String(block.props.contentTypeSlug ?? "");
  const selectedContentType = enabledContentTypes.find((type) => type.slug === contentTypeSlug);
  const selectedCollectionSlugs = ((block.props.collectionSlugs as string[] | undefined) ??
    (block.props.collectionSlug ? [String(block.props.collectionSlug)] : []));
  const taxonomyOptions = (fieldKey: string) => (selectedContentType?.selectFields ?? [])
    .filter((field) => field.key.toLowerCase().includes(fieldKey))
    .flatMap((field) => field.options);
  const layout = (block.props.layout as string) ?? "grid";
  const cardVariant = (block.props.cardVariant as CardVariant) ?? "default";

  return (
    <div className="space-y-4">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />
      <LocalizedBlockInput block={block} field="badge" label="Badge" />
      <p className="text-xs text-muted-foreground">
        Recommend content items from a dynamic content type using the current page context, shared
        taxonomy, or a curated list.
      </p>
      <div>
        <Label className="text-xs">Rule</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={rule}
          onChange={(e) => setProp(block, onChange, "rule", e.target.value)}
        >
          <option value="taxonomy">Taxonomy match</option>
          <option value="anchor">Current page context</option>
          <option value="manual">Manual IDs</option>
        </select>
      </div>
      {rule === "anchor" ? (
        <div className="space-y-3 rounded-md border p-3">
          <div>
            <Label className="text-xs">Anchor type</Label>
            <select
              className="w-full border rounded-md h-9 px-2 text-sm mt-1"
              value={(block.props.anchorContext as string) ?? "page"}
              onChange={(e) => setProp(block, onChange, "anchorContext", e.target.value)}
            >
              <option value="page">Current page (automatic)</option>
              <option value="contentItem">Content item</option>
            </select>
          </div>
          <Input
            placeholder="Anchor ID or slug (optional; defaults to current item)"
            value={String(block.props.anchorId ?? block.props.anchorSlug ?? "")}
            onChange={(e) =>
              onChange(patchBlockSettings(block, { anchorId: e.target.value, anchorSlug: e.target.value }))
            }
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to use the current content item when this block is placed on its detail page.
          </p>
        </div>
      ) : null}
      {rule === "taxonomy" ? (
        <div className="space-y-3 rounded-md border p-3">
          <Label className="text-xs">Taxonomy filters</Label>
          <div>
            <Label className="text-xs">Dynamic content type</Label>
            <select
              className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
              value={contentTypeSlug}
              onChange={(event) =>
                onChange(
                  patchBlockSettings(block, {
                    contentTypeSlug: event.target.value,
                    collectionSlug: "",
                    collectionSlugs: [],
                    categorySlugs: [],
                    tags: [],
                  }),
                )
              }
            >
              <option value="">Select a content type</option>
              {enabledContentTypes.map((type) => (
                <option key={type.slug} value={type.slug}>
                  {type.labelPlural} ({type.slug})
                </option>
              ))}
            </select>
          </div>
          {selectedContentType?.collections?.length ? (
            <TaxonomyMultiSelect
              label="Collections"
              options={selectedContentType.collections.map((collection) => ({
                value: collection.slug,
                label: collection.name,
              }))}
              value={selectedCollectionSlugs}
              onChange={(values) =>
                onChange(patchBlockSettings(block, { collectionSlugs: values, collectionSlug: "" }))
              }
              placeholder="Search collections…"
            />
          ) : null}
          <TaxonomyMultiSelect
            label="Categories"
            options={taxonomyOptions("categor")}
            value={(block.props.categorySlugs as string[]) ?? []}
            onChange={(values) => setProp(block, onChange, "categorySlugs", values)}
            placeholder="Search or add categories…"
          />
          <TaxonomyMultiSelect
            label="Tags"
            options={taxonomyOptions("tag")}
            value={(block.props.tags as string[]) ?? []}
            onChange={(values) => setProp(block, onChange, "tags", values)}
            placeholder="Search or add tags…"
          />
          <p className="text-xs text-muted-foreground">
            Options come from the selected dynamic content type schema and its collections.
          </p>
        </div>
      ) : null}
      <Input
        type="number"
        placeholder="Limit"
        value={String((block.props.limit as number) ?? 6)}
        onChange={(e) => setProp(block, onChange, "limit", Number(e.target.value))}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.excludeCurrentItem !== false}
          onChange={(e) => setProp(block, onChange, "excludeCurrentItem", e.target.checked)}
        />
        Exclude the current item
      </label>
      <div className="space-y-3 rounded-md border p-3">
        <p className="text-sm font-medium">Display</p>
        <div>
          <Label className="text-xs">Layout</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={layout}
            onChange={(e) => setProp(block, onChange, "layout", e.target.value)}
          >
            <option value="grid">Grid</option>
            <option value="carousel">Carousel</option>
            <option value="list">List</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Columns</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={String((block.props.columns as number) ?? 3)}
            onChange={(e) => setProp(block, onChange, "columns", Number(e.target.value) as 2 | 3 | 4)}
          >
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
          {layout === "carousel" ? (
            <p className="mt-1 text-xs text-muted-foreground">Used as slides per view for the carousel.</p>
          ) : null}
        </div>
        <div>
          <Label className="text-xs">Card style</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={cardVariant}
            onChange={(e) => setProp(block, onChange, "cardVariant", e.target.value)}
          >
            {CARD_VARIANT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {layout === "carousel" ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={block.props.showArrows !== false}
              onChange={(e) => setProp(block, onChange, "showArrows", e.target.checked)}
            />
            Show left / right arrows
          </label>
        ) : null}
      </div>
      {rule === "manual" ? (
        <ModalRepeatableListEditor
          items={manualItems.map((item, idx) => ({
            id: `${item.entityId || "item"}-${idx}`,
            entityId: item.entityId,
          }))}
          onChange={(next) =>
            setProp(
              block,
              onChange,
              "manualItems",
              next.map(({ entityId }) => ({
                entityType: SearchEntityType.CONTENT_ITEM,
                entityId,
              })),
            )
          }
          createEmpty={() => ({ id: newId("rel"), entityId: "" })}
          strings={{
            sectionLabel: "Manual items",
            addButtonLabel: "Add item",
            emptyLabel: "No manual items yet. Click Add item to create one.",
            dialogTitleCreate: "Add manual item",
            dialogTitleEdit: "Edit manual item",
            saveButtonLabelCreate: "Save item",
            saveButtonLabelEdit: "Save item",
          }}
          renderSummary={(item) => ({
            title: item.entityId || "Unassigned item",
            meta: ["Content item"],
          })}
          renderForm={(draft, onUpdate) => (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Content item ID / slug</Label>
                <Input
                  className="mt-1"
                  placeholder="Paste the item ID or public slug"
                  value={draft.entityId}
                  onChange={(e) => onUpdate({ entityId: e.target.value })}
                />
              </div>
            </div>
          )}
        />
      ) : null}
    </div>
  );
}

export function RecentlyViewedBlockFields({ block, onChange }: Props) {
  return (
    <div className="space-y-4">
      <LocalizedBlockTitle block={block} />
      <Input
        type="number"
        placeholder="Limit"
        value={String((block.props.limit as number) ?? 8)}
        onChange={(e) => setProp(block, onChange, "limit", Number(e.target.value))}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.excludeCurrentPage !== false}
          onChange={(e) => setProp(block, onChange, "excludeCurrentPage", e.target.checked)}
        />
        Exclude current page
      </label>
      <div>
        <Label className="text-xs">Layout</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.layout as string) ?? "grid"}
          onChange={(e) => setProp(block, onChange, "layout", e.target.value)}
        >
          <option value="grid">Grid</option>
          <option value="list">List</option>
        </select>
      </div>
      <ProductCardDisplayOverrideFields
        block={block}
        onChange={(key, value) => setProp(block, onChange, key, value)}
      />
    </div>
  );
}

export function getDiscoveryBlockFields(type: BlockType) {
  switch (type) {
    case "searchBlock":
      return SearchBlockFields;
    case "advancedFilters":
      return AdvancedFiltersBlockFields;
    case "categoryExplorer":
      return CategoryExplorerBlockFields;
    case "relatedContent":
      return RelatedContentBlockFields;
    case "recentlyViewed":
      return RecentlyViewedBlockFields;
    default:
      return null;
  }
}
