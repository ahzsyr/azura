"use client";

import type { BlockNode } from "@/types/builder";
import { mergeDisplaySettings, type DisplaySettings } from "@/schemas/content/display-settings";
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
      displaySettings: {
        ...mergeDisplaySettings(block.props.displaySettings as Partial<DisplaySettings>),
        ...next,
      },
    },
  });
}

const CONTENT_TYPES = [
  { value: "catalog-items", label: "Catalog Items" },
  { value: "listings", label: "Listings" },
  { value: "offerings", label: "Offerings" },
];

export function ContentBlockFields({ block, onChange }: Props) {
  const setProp = (key: string, value: unknown) =>
    onChange({ ...block, props: { ...block.props, [key]: value } });

  const settings = mergeDisplaySettings(block.props.displaySettings as Partial<DisplaySettings>);

  return (
    <div className="space-y-4">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />

      <div className="space-y-2">
        <Label>Content type</Label>
        <select
          className="flex h-9 w-full rounded-md border px-2 text-sm"
          value={(block.props.contentTypeSlug as string) ?? "catalog-items"}
          onChange={(e) => setProp("contentTypeSlug", e.target.value)}
        >
          {CONTENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <Input
        placeholder="Collection slug (optional)"
        value={(block.props.collectionSlug as string) ?? ""}
        onChange={(e) => setProp("collectionSlug", e.target.value)}
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(block.props.featuredOnly)}
          onChange={(e) => setProp("featuredOnly", e.target.checked)}
        />
        Featured only
      </label>

      <Input
        type="number"
        placeholder="Limit"
        value={String((block.props.limit as number) ?? settings.limit)}
        onChange={(e) => setProp("limit", Number(e.target.value))}
      />

      <Input
        placeholder="View all href (optional)"
        value={(block.props.viewAllHref as string) ?? ""}
        onChange={(e) => setProp("viewAllHref", e.target.value)}
      />

      <div className="rounded-lg border p-3 space-y-3">
        <p className="text-sm font-medium">Display</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.showExcerpt}
            onChange={(e) => setDisplaySettings(block, onChange, { showExcerpt: e.target.checked })}
          />
          Show excerpt
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.showPrice}
            onChange={(e) => setDisplaySettings(block, onChange, { showPrice: e.target.checked })}
          />
          Show price
        </label>
        <div className="space-y-1">
          <Label className="text-xs">Columns</Label>
          <select
            className="flex h-9 w-full rounded-md border px-2 text-sm"
            value={String(settings.columns)}
            onChange={(e) =>
              setDisplaySettings(block, onChange, {
                columns: Number(e.target.value) as 2 | 3 | 4,
              })
            }
          >
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </div>
      </div>
    </div>
  );
}
