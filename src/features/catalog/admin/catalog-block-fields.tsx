"use client";

import { useEffect } from "react";
import type { BlockNode, ContentTypeOption } from "@/types/builder";
import { EntityDisplaySettingsPanel } from "@/features/catalog/admin/entity-display-settings-panel";
import { mergeDisplaySettings, type DisplaySettings } from "@/schemas/catalog/display-settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LocalizedBlockTextarea,
  LocalizedBlockTitle,
} from "@/features/builder/block-translation-context";

/** Maps legacy catalog source values to content type slugs for enabled-type filtering. */
const LEGACY_SOURCE_TO_SLUG: Record<string, string> = {
  packages: "catalog-items",
  hotels: "listings",
  services: "offerings",
};

/** Backward compatibility: some blocks may have source saved as content-type slugs. */
const SOURCE_SLUG_TO_LEGACY: Record<string, "packages" | "hotels" | "services"> = {
  "catalog-items": "packages",
  listings: "hotels",
  offerings: "services",
};

const ALL_LEGACY_SOURCES = [
  { value: "packages", label: "Packages" },
  { value: "hotels", label: "Hotels / Properties" },
  { value: "services", label: "Services" },
];

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  contentTypeOptions?: ContentTypeOption[];
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

export function CatalogBlockFields({ block, onChange, contentTypeOptions }: Props) {
  const setProp = (key: string, value: unknown) =>
    onChange({ ...block, props: { ...block.props, [key]: value } });

  const rawSource = (block.props.source as string) ?? "packages";
  const source = SOURCE_SLUG_TO_LEGACY[rawSource] ?? rawSource;
  const settings = mergeDisplaySettings(block.props.displaySettings as Partial<DisplaySettings>);

  // One-time in-editor migration: rewrite slug-style source to legacy source value expected by runtime.
  useEffect(() => {
    const migrated = SOURCE_SLUG_TO_LEGACY[rawSource];
    if (migrated && migrated !== rawSource) {
      setProp("source", migrated);
    }
  }, [rawSource]);

  // When contentTypeOptions are provided, filter visible sources to enabled types only.
  const enabledSlugs = contentTypeOptions
    ? new Set(contentTypeOptions.map((t) => t.slug))
    : null;

  const visibleSources = (() => {
    if (!enabledSlugs) return ALL_LEGACY_SOURCES;
    const filtered = ALL_LEGACY_SOURCES.filter((s) =>
      enabledSlugs.has(LEGACY_SOURCE_TO_SLUG[s.value] ?? "")
    );
    // Safety fallback: if mapping/config is temporarily inconsistent, keep sources selectable.
    return filtered.length > 0 ? filtered : ALL_LEGACY_SOURCES;
  })();

  // Use labelPlural from the matching ContentTypeOption when available.
  const resolveLabel = (s: { value: string; label: string }) => {
    if (!contentTypeOptions) return s.label;
    const slug = LEGACY_SOURCE_TO_SLUG[s.value];
    const opt = contentTypeOptions.find((t) => t.slug === slug);
    return opt?.labelPlural?.trim() || s.label;
  };

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
          {visibleSources.map((s) => (
            <option key={s.value} value={s.value}>
              {resolveLabel(s)}
            </option>
          ))}
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

