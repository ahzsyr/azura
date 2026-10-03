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
import {
  isRetiredOfferingTypeSelectField,
  TYPE_TO_LEGACY_SOURCE,
} from "@/features/content/content-type.registry";
import {
  normalizeCatalogSourceForActiveTypes,
  resolveCatalogSourceFromBlock,
} from "@/features/catalog/catalog-source";
import { fetchContentTypeOptionsForBuilder } from "@/features/content/content-type.actions";
import {
  fetchCatalogSourceItems,
  type CatalogSourceItemPreview,
} from "@/features/catalog/admin/catalog-source-items.actions";
import { getBlockSettings, patchBlockSettings } from "@/features/builder/instance/block-instance";

const PICKER_ITEM_LIMIT = 100;

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

function displaySourceForSettings(typeSlug: string): string {
  return TYPE_TO_LEGACY_SOURCE[typeSlug] ?? typeSlug;
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
  const typeOptions = (liveOptions.length ? liveOptions : contentTypeOptions ?? []).filter(
    (type) => type.isEnabled !== false,
  );
  const resolvedSource = resolveCatalogSourceFromBlock(block);
  const activeSlugs = typeOptions.map((type) => type.slug);
  const sourceSlug = normalizeCatalogSourceForActiveTypes(resolvedSource, activeSlugs);
  const settings = mergeDisplaySettings(catalogFields.displaySettings as Partial<DisplaySettings>);
  const selectedType = typeOptions.find((type) => type.slug === sourceSlug);
  const collections = selectedType?.collections ?? [];
  const selectFields = (selectedType?.selectFields ?? []).filter(
    (field) => !isRetiredOfferingTypeSelectField(field),
  );
  const attributeFilters = (catalogFields.attributeFilters as Record<string, string> | undefined) ?? {};
  const categorySlug = ((catalogFields.categorySlug as string) ?? "").trim();
  const featuredOnly = Boolean(catalogFields.featuredOnly);
  const manualIds = Array.isArray(catalogFields.manualIds)
    ? (catalogFields.manualIds as string[]).filter(Boolean)
    : [];
  const staleTypeFilterKeys = Object.keys(attributeFilters).filter((key) =>
    isRetiredOfferingTypeSelectField({
      key,
      label: key,
      options: [{ value: attributeFilters[key] }],
    }),
  );
  const hasStaleServiceType = Boolean(
    typeof catalogFields.serviceType === "string" && catalogFields.serviceType.trim(),
  );

  useEffect(() => {
    let cancelled = false;
    setItemsLoading(true);
    void fetchCatalogSourceItems({
      source: sourceSlug,
      collectionSlug: categorySlug || undefined,
      featuredOnly,
      limit: PICKER_ITEM_LIMIT,
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
  }, [sourceSlug, categorySlug, featuredOnly]);

  useEffect(() => {
    if (!activeSlugs.length || !sourceSlug) return;
    if (resolvedSource === sourceSlug) return;
    onChange(patchBlockSettings(block, { source: sourceSlug }));
  }, [activeSlugs.join("|"), sourceSlug, resolvedSource]);

  useEffect(() => {
    if (!staleTypeFilterKeys.length && !hasStaleServiceType) return;
    const nextFilters = { ...attributeFilters };
    for (const key of staleTypeFilterKeys) delete nextFilters[key];
    onChange(
      patchBlockSettings(block, {
        attributeFilters: nextFilters,
        serviceType: "",
      }),
    );
  }, [staleTypeFilterKeys.join("|"), hasStaleServiceType]);

  const setSelectFilter = (key: string, value: string) => {
    if (isRetiredOfferingTypeSelectField({ key, options: [{ value }] })) return;
    const nextFilters = { ...attributeFilters };
    if (value) nextFilters[key] = value;
    else delete nextFilters[key];

    onChange(
      patchBlockSettings(block, {
        source: sourceSlug,
        attributeFilters: nextFilters,
        serviceType: "",
        ...(key === "city" ? { city: value } : {}),
      }),
    );
  };

  const toggleManualId = (id: string) => {
    const next = manualIds.includes(id) ? manualIds.filter((x) => x !== id) : [...manualIds, id];
    setProp("manualIds", next);
  };

  const clearManualIds = () => setProp("manualIds", []);

  return (
    <div className="space-y-4">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />

      <div className="space-y-2">
        <Label>Type</Label>
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
              {type.slug && type.slug.toLowerCase() !== type.labelPlural.trim().toLowerCase()
                ? ` (${type.slug})`
                : ""}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Type is the content type for this block. Options come from Content types you have enabled.
        </p>
      </div>

      <div className="rounded-md border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium">Content in this block</p>
          {manualIds.length > 0 ? (
            <button
              type="button"
              className="text-xs text-primary underline"
              onClick={clearManualIds}
            >
              Show all ({manualIds.length} selected)
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">Select items to pin</span>
          )}
        </div>
        {itemsLoading ? (
          <p className="text-xs text-muted-foreground">Loading items…</p>
        ) : sourceItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No items found for this type. Add or publish entries under Content.
          </p>
        ) : (
          <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
            {sourceItems.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-background/80">
                  <input
                    type="checkbox"
                    checked={manualIds.includes(item.id)}
                    onChange={() => toggleManualId(item.id)}
                  />
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  {item.status !== "PUBLISHED" ? (
                    <span className="shrink-0 text-muted-foreground">{item.status}</span>
                  ) : null}
                </label>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Leave unchecked to show all matching items. Checked items override automatic ordering.
        </p>
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
