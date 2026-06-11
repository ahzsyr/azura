"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

export function RelatedProductsBlockFields({ block, onChange }: Props) {
  const setProp = (key: string, value: unknown) => {
    onChange(patchBlockSettings(block, { [key]: value }));
  };

  const rule = (block.props.rule as string) ?? "collection";

  return (
    <div className="space-y-4">
      <LocalizedBlockTitle block={block} />
      <div>
        <Label className="text-xs">Recommendation rule</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={rule}
          onChange={(e) => setProp("rule", e.target.value)}
        >
          <option value="collection">Same collection</option>
          <option value="anchor">Related to anchor product</option>
          <option value="brand">Same brand</option>
          <option value="tags">Matching tags</option>
          <option value="manual">Manual slugs</option>
        </select>
      </div>
      {rule === "anchor" && (
        <Input
          placeholder="Anchor product slug"
          value={(block.props.anchorSlug as string) ?? ""}
          onChange={(e) => setProp("anchorSlug", e.target.value)}
        />
      )}
      {rule === "collection" && (
        <Input
          placeholder="Collection slug"
          value={(block.props.collectionSlug as string) ?? ""}
          onChange={(e) => setProp("collectionSlug", e.target.value)}
        />
      )}
      {rule === "brand" && (
        <Input
          placeholder="Brand name"
          value={(block.props.brand as string) ?? ""}
          onChange={(e) => setProp("brand", e.target.value)}
        />
      )}
      {rule === "tags" && (
        <Input
          placeholder="Tags (comma-separated)"
          value={((block.props.tags as string[]) ?? []).join(", ")}
          onChange={(e) =>
            setProp(
              "tags",
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
      )}
      {rule === "manual" && (
        <Input
          placeholder="Product slugs (comma-separated)"
          value={((block.props.productSlugs as string[]) ?? []).join(", ")}
          onChange={(e) =>
            setProp(
              "productSlugs",
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
      )}
      <div>
        <Label className="text-xs">Layout</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.layout as string) ?? "grid"}
          onChange={(e) => setProp("layout", e.target.value)}
        >
          <option value="grid">Grid</option>
          <option value="carousel">Carousel</option>
        </select>
      </div>
      <div>
        <Label className="text-xs">Max products</Label>
        <Input
          type="number"
          min={1}
          max={24}
          className="mt-1"
          value={String(block.props.limit ?? 4)}
          onChange={(e) => setProp("limit", Number(e.target.value))}
        />
      </div>
    </div>
  );
}
