"use client";

import type { BlockNode } from "@/types/builder";
import { Label } from "@/components/ui/label";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import type { CollectionBuilderOption } from "@/features/builder/blocks/commerce/product-blocks/types";
import { CollectionBuilderSelect } from "@/features/builder/blocks/commerce/product-blocks/admin/builder-catalog-selects";
import { ShowcaseHeaderFields } from "@/features/builder/blocks/commerce/commerce-showcase/admin/showcase-shared-fields";

export function ProductDiscoveryBlockFields({
  block,
  onChange,
  collectionOptions = [],
}: {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  collectionOptions?: CollectionBuilderOption[];
}) {
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));

  return (
    <div className="space-y-4">
      <ShowcaseHeaderFields block={block} onChange={onChange} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Layout</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={(block.props.layout as string) ?? "grid"}
            onChange={(e) => setProp("layout", e.target.value)}
          >
            <option value="grid">Grid</option>
            <option value="slider">Slider</option>
            <option value="masonry">Masonry</option>
            <option value="list">List</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Load mode</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={(block.props.loadMode as string) ?? "paginated"}
            onChange={(e) => setProp("loadMode", e.target.value)}
          >
            <option value="paginated">Paginated</option>
            <option value="infinite">Infinite</option>
            <option value="loadMore">Load more</option>
          </select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Scope collection</Label>
        <div className="mt-1">
          <CollectionBuilderSelect
            id={`${block.id}-discovery-collection`}
            collections={collectionOptions}
            value={(block.props.collectionSlug as string) ?? ""}
            onChange={(slug) => setProp("collectionSlug", slug)}
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Page size</Label>
        <input
          type="number"
          min={4}
          max={48}
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.pageSize as number) ?? 12}
          onChange={(e) => setProp("pageSize", Number(e.target.value))}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.ajaxEnabled !== false}
          onChange={(e) => setProp("ajaxEnabled", e.target.checked)}
        />
        AJAX filtering
      </label>
    </div>
  );
}
