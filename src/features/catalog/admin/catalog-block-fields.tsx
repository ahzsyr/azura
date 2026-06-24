"use client";

import type { BlockNode } from "@/types/builder";
import { EntityDisplaySettingsPanel } from "@/features/catalog/admin/entity-display-settings-panel";
import { mergeDisplaySettings, type DisplaySettings } from "@/schemas/catalog/display-settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LocalizedBlockTextarea,
  LocalizedBlockTitle,
} from "@/features/builder/block-translation-context";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

function setDisplaySettings(block: BlockNode, onChange: (b: BlockNode) => void, next: Partial<DisplaySettings>) {
  onChange({
    ...block,
    props: {
      ...block.props,
      displaySettings: { ...mergeDisplaySettings(block.props.displaySettings as Partial<DisplaySettings>), ...next },
    },
  });
}

export function CatalogBlockFields({ block, onChange }: Props) {
  const setProp = (key: string, value: unknown) =>
    onChange({ ...block, props: { ...block.props, [key]: value } });

  const source = (block.props.source as string) ?? "packages";
  const settings = mergeDisplaySettings(block.props.displaySettings as Partial<DisplaySettings>);

  return (
    <div className="space-y-4">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />

      <div className="space-y-2">
        <Label>Source</Label>
        <select
          className="flex h-9 w-full rounded-md border px-2 text-sm"
          value={source}
          onChange={(e) => setProp("source", e.target.value)}
        >
          <option value="packages">Packages</option>
          <option value="hotels">Hotels</option>
          <option value="services">Services</option>
        </select>
      </div>

      {source === "packages" && (
        <>
          <Input
            placeholder="Category slug (optional)"
            value={(block.props.categorySlug as string) ?? ""}
            onChange={(e) => setProp("categorySlug", e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(block.props.featuredOnly)}
              onChange={(e) => setProp("featuredOnly", e.target.checked)}
            />
            Featured only
          </label>
        </>
      )}

      {source === "hotels" && (
        <select
          className="flex h-9 w-full rounded-md border px-2 text-sm"
          value={(block.props.city as string) ?? ""}
          onChange={(e) => setProp("city", e.target.value)}
        >
          <option value="">All cities</option>
          <option value="MAKKAH">Makkah</option>
          <option value="MADINAH">Madinah</option>
        </select>
      )}

      {source === "services" && (
        <select
          className="flex h-9 w-full rounded-md border px-2 text-sm"
          value={(block.props.serviceType as string) ?? ""}
          onChange={(e) => setProp("serviceType", e.target.value)}
        >
          <option value="">All types</option>
          <option value="TRANSPORT">Transport</option>
          <option value="AIRPORT_PICKUP">Airport Pickup</option>
          <option value="HOTEL">Hotel</option>
          <option value="OTHER">Other</option>
        </select>
      )}

      <EntityDisplaySettingsPanel
        source={source as "packages" | "hotels" | "services"}
        value={settings}
        onChange={(next) => setDisplaySettings(block, onChange, next)}
        showPreview
      />

      <Input
        placeholder="View all link (optional)"
        value={(block.props.viewAllHref as string) ?? ""}
        onChange={(e) => setProp("viewAllHref", e.target.value)}
      />
      <LocalizedBlockTextarea block={block} field="emptyMessage" label="Empty message" rows={2} />
    </div>
  );
}

