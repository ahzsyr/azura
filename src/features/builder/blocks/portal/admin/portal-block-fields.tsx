"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { PricingBlockFields } from "@/presets/pricing/admin/pricing-block-fields";
import { ChangelogBlockFields } from "@/features/builder/blocks/content/admin/changelog-block-fields";

export { PricingBlockFields, ChangelogBlockFields };

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

function setProp(block: BlockNode, onChange: (b: BlockNode) => void, key: string, value: unknown) {
  onChange(patchBlockSettings(block, { [key]: value }));
}

function SlugField({
  block,
  onChange,
  propKey,
  label,
  placeholder,
}: Props & { propKey: string; label: string; placeholder: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        className="mt-1"
        placeholder={placeholder}
        value={(block.props[propKey] as string) ?? ""}
        onChange={(e) => setProp(block, onChange, propKey, e.target.value)}
      />
    </div>
  );
}

export function PricingCalculatorBlockFields({ block, onChange }: Props) {
  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <SlugField
        block={block}
        onChange={onChange}
        propKey="pricingCalculatorSlug"
        label="Calculator slug"
        placeholder="e.g. enterprise-quote"
      />
      <div>
        <Label className="text-xs">Layout</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.layout as string) ?? "stacked"}
          onChange={(e) => setProp(block, onChange, "layout", e.target.value)}
        >
          <option value="stacked">Stacked</option>
          <option value="inline">Inline</option>
          <option value="card">Card</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.showDescription !== false}
          onChange={(e) => setProp(block, onChange, "showDescription", e.target.checked)}
        />
        Show description
      </label>
    </div>
  );
}

export function KnowledgeBaseBlockFields({ block, onChange }: Props) {
  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <SlugField
        block={block}
        onChange={onChange}
        propKey="knowledgeBaseSlug"
        label="Knowledge base slug"
        placeholder="e.g. help-center"
      />
      <div>
        <Label className="text-xs">Layout</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.layout as string) ?? "grid"}
          onChange={(e) => setProp(block, onChange, "layout", e.target.value)}
        >
          <option value="grid">Grid</option>
          <option value="list">List</option>
          <option value="sidebar">Sidebar</option>
        </select>
      </div>
      <Input
        placeholder="Category slug filter (optional)"
        value={(block.props.categorySlug as string) ?? ""}
        onChange={(e) => setProp(block, onChange, "categorySlug", e.target.value)}
      />
      <Input
        type="number"
        placeholder="Limit (0 = all)"
        value={String(block.props.limit ?? 0)}
        onChange={(e) => setProp(block, onChange, "limit", Number(e.target.value))}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.showSearch !== false}
          onChange={(e) => setProp(block, onChange, "showSearch", e.target.checked)}
        />
        Show search
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.showCategories !== false}
          onChange={(e) => setProp(block, onChange, "showCategories", e.target.checked)}
        />
        Show categories
      </label>
    </div>
  );
}

export function DocumentationNavBlockFields({ block, onChange }: Props) {
  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <SlugField
        block={block}
        onChange={onChange}
        propKey="docPortalSlug"
        label="Documentation portal slug"
        placeholder="e.g. api-docs"
      />
      <Input
        placeholder="Version slug (optional)"
        value={(block.props.versionSlug as string) ?? ""}
        onChange={(e) => setProp(block, onChange, "versionSlug", e.target.value)}
      />
      <Input
        placeholder="Root section slug (optional)"
        value={(block.props.rootSectionSlug as string) ?? ""}
        onChange={(e) => setProp(block, onChange, "rootSectionSlug", e.target.value)}
      />
      <div>
        <Label className="text-xs">Layout</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.layout as string) ?? "sidebar"}
          onChange={(e) => setProp(block, onChange, "layout", e.target.value)}
        >
          <option value="sidebar">Sidebar</option>
          <option value="tree">Tree</option>
          <option value="tabs">Tabs</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.showBreadcrumbs !== false}
          onChange={(e) => setProp(block, onChange, "showBreadcrumbs", e.target.checked)}
        />
        Show breadcrumbs
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.showToc !== false}
          onChange={(e) => setProp(block, onChange, "showToc", e.target.checked)}
        />
        Show table of contents
      </label>
    </div>
  );
}

export function StatusDashboardBlockFields({ block, onChange }: Props) {
  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <SlugField
        block={block}
        onChange={onChange}
        propKey="statusBoardSlug"
        label="Status board slug"
        placeholder="e.g. platform-status"
      />
      <div>
        <Label className="text-xs">Layout</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.layout as string) ?? "full"}
          onChange={(e) => setProp(block, onChange, "layout", e.target.value)}
        >
          <option value="full">Full</option>
          <option value="compact">Compact</option>
        </select>
      </div>
      <Input
        type="number"
        placeholder="Polling interval (ms)"
        value={String(block.props.pollingIntervalMs ?? 60000)}
        onChange={(e) => setProp(block, onChange, "pollingIntervalMs", Number(e.target.value))}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.showUptime !== false}
          onChange={(e) => setProp(block, onChange, "showUptime", e.target.checked)}
        />
        Show uptime
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.showIncidents !== false}
          onChange={(e) => setProp(block, onChange, "showIncidents", e.target.checked)}
        />
        Show incidents
      </label>
    </div>
  );
}

export function TeamDirectoryBlockFields({ block, onChange }: Props) {
  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <SlugField
        block={block}
        onChange={onChange}
        propKey="teamDirectorySlug"
        label="Team directory slug"
        placeholder="e.g. our-team"
      />
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
      <Input
        placeholder="Department ID filter (optional)"
        value={(block.props.departmentId as string) ?? ""}
        onChange={(e) => setProp(block, onChange, "departmentId", e.target.value)}
      />
      <Input
        type="number"
        placeholder="Limit (0 = all)"
        value={String(block.props.limit ?? 0)}
        onChange={(e) => setProp(block, onChange, "limit", Number(e.target.value))}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.showSearch !== false}
          onChange={(e) => setProp(block, onChange, "showSearch", e.target.checked)}
        />
        Show search
      </label>
    </div>
  );
}

export function PartnerDirectoryBlockFields({ block, onChange }: Props) {
  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <SlugField
        block={block}
        onChange={onChange}
        propKey="partnerProgramSlug"
        label="Partner program slug"
        placeholder="e.g. partners"
      />
      <div>
        <Label className="text-xs">Layout</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.layout as string) ?? "grid"}
          onChange={(e) => setProp(block, onChange, "layout", e.target.value)}
        >
          <option value="grid">Grid</option>
          <option value="list">List</option>
          <option value="map">Map</option>
        </select>
      </div>
      <Input
        placeholder="Category slug filter"
        value={(block.props.categorySlug as string) ?? ""}
        onChange={(e) => setProp(block, onChange, "categorySlug", e.target.value)}
      />
      <Input
        placeholder="Location filter"
        value={(block.props.locationFilter as string) ?? ""}
        onChange={(e) => setProp(block, onChange, "locationFilter", e.target.value)}
      />
      <Input
        type="number"
        placeholder="Limit (0 = all)"
        value={String(block.props.limit ?? 0)}
        onChange={(e) => setProp(block, onChange, "limit", Number(e.target.value))}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(block.props.showMap)}
          onChange={(e) => setProp(block, onChange, "showMap", e.target.checked)}
        />
        Show map placeholder
      </label>
    </div>
  );
}
