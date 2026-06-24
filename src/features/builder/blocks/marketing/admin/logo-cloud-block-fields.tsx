"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { ItemCard, RepeatableSection } from "@/features/builder/blocks/content/admin/shared/repeatable-section";
import { LocalizedBlockTextarea, LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import {
  emptyLocalizedItemFields,
  LocalizedItemFields,
} from "@/features/builder/blocks/marketing/admin/localized-item-fields";
import { newId, type LogoItem } from "@/features/builder/blocks/marketing/schemas/marketing-blocks";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

export function LogoCloudBlockFields({ block, onChange }: Props) {
  const items = (block.props.items as LogoItem[]) ?? [];
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));
  const updateItems = (next: LogoItem[]) => setProp("items", next);

  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />
      <div>
        <Label className="text-xs">Display mode</Label>
        <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(block.props.displayMode as string) ?? "grid"} onChange={(e) => setProp("displayMode", e.target.value)}>
          <option value="grid">Grid</option>
          <option value="carousel">Carousel</option>
          <option value="marquee">Marquee</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Columns</Label>
          <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={String(block.props.columns ?? 5)} onChange={(e) => setProp("columns", Number(e.target.value))}>
            {[3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Logo size</Label>
          <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(block.props.logoSize as string) ?? "md"} onChange={(e) => setProp("logoSize", e.target.value)}>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={block.props.grayscale !== false} onChange={(e) => setProp("grayscale", e.target.checked)} />
        Grayscale
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={block.props.grayscaleHover !== false} onChange={(e) => setProp("grayscaleHover", e.target.checked)} />
        Color on hover
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={Boolean(block.props.groupByCategory)} onChange={(e) => setProp("groupByCategory", e.target.checked)} />
        Group by category
      </label>
      <RepeatableSection
        label="Logos"
        onAdd={() =>
          updateItems([
            ...items,
            {
              id: newId("logo"),
              imageUrl: "",
              mediaAssetId: "",
              href: "",
              ...emptyLocalizedItemFields(["name", "category"]),
            } as LogoItem,
          ])
        }
      >
        {items.map((item) => (
          <ItemCard key={item.id} onRemove={() => updateItems(items.filter((i) => i.id !== item.id))}>
            <UrlPrimaryMediaPickerField
              label="Logo image"
              mediaTypes={["IMAGE", "SVG"]}
              url={item.imageUrl}
              onPick={({ url, mediaId }) =>
                updateItems(items.map((i) => (i.id === item.id ? { ...i, imageUrl: url, mediaAssetId: mediaId ?? "" } : i)))
              }
            />
            <LocalizedItemFields
              fields={[
                { key: "name", label: "Name" },
                { key: "category", label: "Category" },
              ]}
              values={item as unknown as Record<string, string>}
              onChange={(patch) => updateItems(items.map((i) => (i.id === item.id ? { ...i, ...patch } : i)))}
            />
            <div>
              <Label className="text-xs">Link href</Label>
              <Input className="mt-1 h-8 text-sm" value={item.href} onChange={(e) => updateItems(items.map((i) => (i.id === item.id ? { ...i, href: e.target.value } : i)))} />
            </div>
          </ItemCard>
        ))}
      </RepeatableSection>
    </div>
  );
}
