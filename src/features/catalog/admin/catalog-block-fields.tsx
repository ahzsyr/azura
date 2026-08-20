"use client";

import { useEffect, useState } from "react";
import type { BlockNode, ContentTypeOption } from "@/types/builder";
import { EntityDisplaySettingsPanel } from "@/features/catalog/admin/entity-display-settings-panel";
import { mergeDisplaySettings, type DisplaySettings } from "@/schemas/catalog/display-settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LocalizedBlockTextarea,
  LocalizedBlockTitle,
} from "@/features/builder/block-translation-context";
import { TYPE_TO_LEGACY_SOURCE } from "@/features/content/content-type.registry";
import { resolveCatalogSourceFromBlock } from "@/features/catalog/catalog-source";
import { fetchContentTypeOptionsForBuilder } from "@/features/content/content-type.actions";
import {
  fetchCatalogSourceItems,
  type CatalogSourceItemPreview,
} from "@/features/catalog/admin/catalog-source-items.actions";
import { getBlockSettings, patchBlockSettings } from "@/features/builder/instance/block-instance";

const FALLBACK_TYPES: ContentTypeOption[] = [
  { slug: "catalog-items", labelPlural: "Catalog items", isEnabled: true },
  { slug: "listings", labelPlural: "Listings", isEnabled: true },
  { slug: "offerings", labelPlural: "Services", isEnabled: true },
];

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  contentTypeOptions?: ContentTypeOption[];
};

function setDisplaySettings(block: BlockNode, onChange: (b: BlockNode) => void, next: Partial<DisplaySettings>) {
  const current = getBlockSettings(block);
  onChange(
    patchBlockSettings(block, {
      displaySettings: {
        ...mergeDisplaySettings(current.displaySettings as Partial<DisplaySettings>),
        ...next,
      },
    }),
  );
}

function displaySourceForSettings(typeSlug: string): "packages" | "hotels" | "services" {
  return TYPE_TO_LEGACY_SOURCE[typeSlug] ?? "packages";
}

export function CatalogBlockFields({ block, onChange, contentTypeOptions }: Props) {
  const [liveOptions, setLiveOptions] = useState<ContentTypeOption[]>(contentTypeOptions ?? []);
  const [sourceItems, setSourceItems] = useState<CatalogSourceItemPreview[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => {
    setLiveOptions(contentTypeOptions ?? []);
  }, [contentTypeOptions]);

  const refreshTypes = () => {
    void fetchContentTypeOptionsForBuilder()
      .then(setLiveOptions)
      .catch(() => {});
  };

  useEffect(() => {
    refreshTypes();
  }, []);

  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));

  const catalogFields = { ...getBlockSettings(block), ...(block.props ?? {}) };
  const sourceSlug = resolveCatalogSourceFromBlock(block);
  const settings = mergeDisplaySettings(catalogFields.displaySettings as Partial<DisplaySettings>);
  const typeOptions = (liveOptions.length ? liveOptions : FALLBACK_TYPES).filter(
    (type) => type.isEnabled !== false,
  );
  const selectedType = typeOptions.find((type) => type.slug === sourceSlug);
  const collections = selectedType?.collections ?? [];
  const selectFields = selectedType?.selectFields ?? [];
  const attributeFilters = (catalogFields.attributeFilters as Record<string, string> | undefined) ?? {};
  const categorySlug = ((catalogFields.categorySlug as string) ?? "").trim();
  const featuredOnly = Boolean(catalogFields.featuredOnly);

  useEffect(() => {
    let cancelled = false;
    setItemsLoading(true);
    void fetchCatalogSourceItems({
      source: sourceSlug,
      collectionSlug: categorySlug || undefined,
      featuredOnly,
      limit: settings.limit,
    })
      .then((items) => {
        if (!cancelled) setSourceItems(items);
      })
      .catch(() => {
        if (!cancelled) setSourceItems([]);
      })
      .finally(() => {
        if (!cancelled) setItemsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sourceSlug, categorySlug, featuredOnly, settings.limit]);

  const setSelectFilter = (key: string, value: string) => {
    const nextFilters = { ...attributeFilters };
    if (value) nextFilters[key] = value;
    else delete nextFilters[key];

    onChange(
      patchBlockSettings(block, {
        source: sourceSlug,
        attributeFilters: nextFilters,
        ...(key === "offeringType" || key === "type" ? { serviceType: value } : {}),
        ...(key === "city" ? { city: value } : {}),
      }),
    );
  };

  return (
    <div className="space-y-4">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />

      <div className="space-y-2">
        <Label>Source</Label>
        <select
          className="flex h-9 w-full rounded-md border px-2 text-sm"
          value={sourceSlug}
          onFocus={refreshTypes}
          onChange={(e) => {
            const nextSlug = e.target.value;
            onChange(
              patchBlockSettings(block, {
                source: nextSlug,
                categorySlug: "",
                city: "",
                serviceType: "",
                attributeFilters: {},
                manualIds: [],
              }),
            );
          }}
        >
          {!selectedType && sourceSlug ? <option value={sourceSlug}>{sourceSlug}</option> : null}
          {typeOptions.map((type) => (
            <option key={type.slug} value={type.slug}>
              {type.labelPlural}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Source is a content type. Choosing one pulls that type’s items into this block.
        </p>
      </div>

      <div className="rounded-md border bg-muted/30 p-3 space-y-2">
        <p className="text-xs font-medium">Items in this block</p>
        {itemsLoading ? (
          <p className="text-xs text-muted-foreground">Loading items…</p>
        ) : sourceItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No items found for this type. Add or unhide entries under Content.
          </p>
        ) : (
          <ul className="space-y-1 text-xs">
            {sourceItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{item.title}</span>
                {item.status !== "PUBLISHED" ? (
                  <span className="shrink-0 text-muted-foreground">{item.status}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {collections.length > 0 ? (
        <div className="space-y-2">
          <Label>Collection</Label>
          <select
            className="flex h-9 w-full rounded-md border px-2 text-sm"
            value={(catalogFields.categorySlug as string) ?? ""}
            onChange={(e) => setProp("categorySlug", e.target.value)}
          >
            <option value="">All collections</option>
            {collections.map((collection) => (
              <option key={collection.slug} value={collection.slug}>
                {collection.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <Input
          placeholder="Collection slug (optional)"
          value={(catalogFields.categorySlug as string) ?? ""}
          onChange={(e) => setProp("categorySlug", e.target.value)}
        />
      )}

      {selectFields.map((field) => {
        const current = attributeFilters[field.key] ?? "";
        return (
          <div key={field.key} className="space-y-2">
            <Label>{field.label}</Label>
            <select
              className="flex h-9 w-full rounded-md border px-2 text-sm"
              value={current}
              onChange={(e) => setSelectFilter(field.key, e.target.value)}
            >
              <option value="">All {field.label.toLowerCase()}</option>
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );
      })}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={featuredOnly}
          onChange={(e) => setProp("featuredOnly", e.target.checked)}
        />
        Featured only
      </label>

      <EntityDisplaySettingsPanel
        source={displaySourceForSettings(sourceSlug)}
        value={settings}
        onChange={(next) => setDisplaySettings(block, onChange, next)}
        showPreview
      />

      <Input
        placeholder="View all link (optional)"
        value={(catalogFields.viewAllHref as string) ?? ""}
        onChange={(e) => setProp("viewAllHref", e.target.value)}
      />
      <LocalizedBlockTextarea block={block} field="emptyMessage" label="Empty message" rows={2} />
    </div>
  );
}
