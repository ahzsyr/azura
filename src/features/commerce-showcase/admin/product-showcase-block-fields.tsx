"use client";

import type { BlockNode } from "@/types/builder";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import type { CollectionBuilderOption, ProductBuilderOption } from "@/features/product-blocks/types";
import { ProductSelectionFields } from "@/features/product-blocks/admin/product-selection-fields";
import { ShowcaseHeaderFields } from "@/features/commerce-showcase/admin/showcase-shared-fields";
import { PRODUCT_SHOWCASE_TAB_PRESETS } from "@/features/commerce-showcase/schemas/showcase-blocks";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  collectionOptions?: CollectionBuilderOption[];
  productOptions?: ProductBuilderOption[];
};

export function ProductShowcaseBlockFields({
  block,
  onChange,
  collectionOptions = [],
  productOptions = [],
}: Props) {
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));
  const mode = (block.props.mode as string) ?? "single";
  const layout = (block.props.layout as string) ?? "grid";
  const source = (block.props.source as string) ?? "featured";

  const addPresetTabs = () => {
    const tabs = PRODUCT_SHOWCASE_TAB_PRESETS.map((preset) => ({
      id: preset.id,
      labelEn: preset.labelEn,
      labelAr: preset.labelAr,
      source: preset.source,
      collectionSlug: "",
      productSlugs: [],
      tags: [],
      brand: "",
      category: "",
      limit: 8,
      sortBy: preset.sortBy ?? "name-asc",
    }));
    onChange(patchBlockSettings(block, { mode: "tabs", tabs }));
  };

  return (
    <div className="space-y-4">
      <ShowcaseHeaderFields block={block} onChange={onChange} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Mode</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={mode}
            onChange={(e) => setProp("mode", e.target.value)}
          >
            <option value="single">Single</option>
            <option value="tabs">Tabs</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Layout</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={layout}
            onChange={(e) => setProp("layout", e.target.value)}
          >
            <option value="grid">Grid</option>
            <option value="carousel">Carousel</option>
            <option value="list">List</option>
            <option value="masonry">Masonry</option>
          </select>
        </div>
      </div>

      {mode === "tabs" ? (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase">Collection tabs</p>
            <Button type="button" size="sm" variant="secondary" onClick={addPresetTabs}>
              Add presets
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {(block.props.tabs as unknown[])?.length ?? 0} tab(s) configured
          </p>
        </div>
      ) : (
        <>
          <div>
            <Label className="text-xs">Source</Label>
            <select
              className="w-full border rounded-md h-9 px-2 text-sm mt-1"
              value={source}
              onChange={(e) => setProp("source", e.target.value)}
            >
              <option value="featured">Featured</option>
              <option value="collection">Collection</option>
              <option value="manual">Manual</option>
              <option value="tags">Tags</option>
              <option value="best_sellers">Best sellers</option>
              <option value="new_arrivals">New arrivals</option>
              <option value="trending">Trending</option>
              <option value="sale">Sale</option>
              <option value="brand">Brand</option>
              <option value="category">Category</option>
              <option value="recommended">Recommended</option>
              <option value="recently_viewed">Recently viewed</option>
            </select>
          </div>
          {(source === "brand" || source === "category") && (
            <div>
              <Label className="text-xs">{source === "brand" ? "Brand" : "Category"}</Label>
              <input
                className="w-full border rounded-md h-9 px-2 text-sm mt-1"
                value={
                  ((source === "brand" ? block.props.brand : block.props.category) as string) ?? ""
                }
                onChange={(e) =>
                  setProp(source === "brand" ? "brand" : "category", e.target.value)
                }
              />
            </div>
          )}
          <ProductSelectionFields
            block={{
              ...block,
              props: {
                ...block.props,
                source: ["collection", "manual", "featured", "tags"].includes(source) ? source : "featured",
              },
            }}
            onChange={onChange}
            collectionOptions={collectionOptions}
            productOptions={productOptions}
          />
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Columns</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={String(block.props.columns ?? 3)}
            onChange={(e) => setProp("columns", Number(e.target.value))}
          >
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Limit</Label>
          <input
            type="number"
            min={1}
            max={48}
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={(block.props.limit as number) ?? 8}
            onChange={(e) => setProp("limit", Number(e.target.value))}
          />
        </div>
      </div>

      {layout === "carousel" && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(block.props.autoplay)}
            onChange={(e) => setProp("autoplay", e.target.checked)}
          />
          Autoplay
        </label>
      )}
    </div>
  );
}
