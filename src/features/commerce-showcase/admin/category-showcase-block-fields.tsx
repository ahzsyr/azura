"use client";

import type { BlockNode } from "@/types/builder";
import { Label } from "@/components/ui/label";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { ShowcaseHeaderFields } from "@/features/commerce-showcase/admin/showcase-shared-fields";

export function CategoryShowcaseBlockFields({
  block,
  onChange,
}: {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
}) {
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));

  return (
    <div className="space-y-4">
      <ShowcaseHeaderFields block={block} onChange={onChange} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Source</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={(block.props.source as string) ?? "collections"}
            onChange={(e) => setProp("source", e.target.value)}
          >
            <option value="collections">Collections</option>
            <option value="productCategories">Product categories</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Layout</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={(block.props.layout as string) ?? "grid"}
            onChange={(e) => setProp("layout", e.target.value)}
          >
            <option value="grid">Grid</option>
            <option value="slider">Slider</option>
            <option value="carousel">Carousel</option>
            <option value="masonry">Masonry</option>
            <option value="list">List</option>
            <option value="cards">Cards</option>
            <option value="megaTiles">Mega tiles</option>
            <option value="banner">Banner</option>
            <option value="icons">Icons</option>
            <option value="nestedTree">Nested tree</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={block.props.showImages !== false}
            onChange={(e) => setProp("showImages", e.target.checked)}
          />
          Show images
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={block.props.showCounts !== false}
            onChange={(e) => setProp("showCounts", e.target.checked)}
          />
          Show counts
        </label>
      </div>
      <div>
        <Label className="text-xs">Limit</Label>
        <input
          type="number"
          min={1}
          max={48}
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.limit as number) ?? 12}
          onChange={(e) => setProp("limit", Number(e.target.value))}
        />
      </div>
    </div>
  );
}
