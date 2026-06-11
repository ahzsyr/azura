"use client";

import type { BlockNode, BlockType } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { SearchEntityType } from "@prisma/client";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

function setProp(block: BlockNode, onChange: (b: BlockNode) => void, key: string, value: unknown) {
  onChange(patchBlockSettings(block, { [key]: value }));
}

const ENTITY_OPTIONS: { value: SearchEntityType; label: string }[] = [
  { value: SearchEntityType.CATALOG_PRODUCT, label: "Products" },
  { value: SearchEntityType.POST, label: "Blog posts" },
  { value: SearchEntityType.CONTENT_ITEM, label: "Content items" },
  { value: SearchEntityType.CMS_PAGE, label: "CMS pages" },
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
  return (
    <div className="space-y-4">
      <LocalizedBlockTitle block={block} />
      <div>
        <Label className="text-xs">Taxonomy source</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.source as string) ?? "collections"}
          onChange={(e) => setProp(block, onChange, "source", e.target.value)}
        >
          <option value="collections">Product collections</option>
          <option value="productCategories">Product categories</option>
          <option value="postCategories">Blog categories</option>
          <option value="contentCollections">Content collections</option>
          <option value="manual">Manual nodes</option>
        </select>
      </div>
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
    </div>
  );
}

export function RelatedContentBlockFields({ block, onChange }: Props) {
  const rule = (block.props.rule as string) ?? "taxonomy";
  return (
    <div className="space-y-4">
      <LocalizedBlockTitle block={block} />
      <p className="text-xs text-muted-foreground">
        Multi-entity recommendations (products, posts, CMS). Prefer over Related Products for mixed
        types.
      </p>
      <div>
        <Label className="text-xs">Rule</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={rule}
          onChange={(e) => setProp(block, onChange, "rule", e.target.value)}
        >
          <option value="taxonomy">Taxonomy match</option>
          <option value="anchor">Anchor page context</option>
          <option value="manual">Manual IDs</option>
        </select>
      </div>
      <div>
        <Label className="text-xs">Entity types (comma: CATALOG_PRODUCT,POST)</Label>
        <Input
          value={((block.props.entityTypes as string[]) ?? []).join(",")}
          onChange={(e) =>
            setProp(
              block,
              onChange,
              "entityTypes",
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s in SearchEntityType)
            )
          }
        />
      </div>
      <Input
        type="number"
        placeholder="Limit"
        value={String((block.props.limit as number) ?? 6)}
        onChange={(e) => setProp(block, onChange, "limit", Number(e.target.value))}
      />
      <div>
        <Label className="text-xs">Layout</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.layout as string) ?? "grid"}
          onChange={(e) => setProp(block, onChange, "layout", e.target.value)}
        >
          <option value="grid">Grid</option>
          <option value="carousel">Carousel</option>
          <option value="list">List</option>
        </select>
      </div>
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
