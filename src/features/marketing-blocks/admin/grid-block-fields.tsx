"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaPickerField } from "@/features/media/components/media-picker-field";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { ItemCard, RepeatableSection } from "@/features/content-blocks/admin/shared/repeatable-section";
import { LocalizedBlockTextarea, LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { IconNameSelect } from "@/features/marketing-blocks/admin/icon-name-select";
import {
  emptyLocalizedItemFields,
  LocalizedItemFields,
} from "@/features/marketing-blocks/admin/localized-item-fields";
import { newId, type GridItem } from "@/features/marketing-blocks/schemas/marketing-blocks";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

function emptyGridItem(): GridItem {
  return {
    id: newId("fg"),
    icon: "compass",
    imageUrl: "",
    mediaAssetId: "",
    href: "",
    ...emptyLocalizedItemFields([
      "title",
      "description",
      "category",
      "linkLabel",
      "metric",
    ]),
  } as GridItem;
}

function GridItemEditor({
  item,
  onUpdate,
  onRemove,
  showMetric,
}: {
  item: GridItem;
  onUpdate: (patch: Partial<GridItem>) => void;
  onRemove: () => void;
  showMetric?: boolean;
}) {
  return (
    <ItemCard onRemove={onRemove}>
      <IconNameSelect value={item.icon} onChange={(icon) => onUpdate({ icon })} />
      <MediaPickerField
        label="Image (optional)"
        mediaTypes={["IMAGE", "SVG"]}
        mediaId={item.mediaAssetId || null}
        url={item.imageUrl}
        onChange={({ mediaId, url }) => onUpdate({ imageUrl: url, mediaAssetId: mediaId ?? "" })}
      />
      <LocalizedItemFields
        fields={[
          { key: "title", label: "Title" },
          { key: "description", label: "Description", multiline: true },
          { key: "category", label: "Category" },
          { key: "linkLabel", label: "Link label" },
          ...(showMetric ? [{ key: "metric", label: "Metric" }] : []),
        ]}
        values={item as unknown as Record<string, string>}
        onChange={(patch) => onUpdate(patch as Partial<GridItem>)}
      />
      <div>
        <Label className="text-xs">Link href</Label>
        <Input className="mt-1 h-8 text-sm" value={item.href} onChange={(e) => onUpdate({ href: e.target.value })} />
      </div>
    </ItemCard>
  );
}

export function FeatureGridBlockFields({ block, onChange }: Props) {
  const items = (block.props.items as GridItem[]) ?? [];
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));
  const updateItems = (next: GridItem[]) => setProp("items", next);

  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />
      <div>
        <Label className="text-xs">Columns</Label>
        <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={String(block.props.columns ?? 3)} onChange={(e) => setProp("columns", Number(e.target.value))}>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      </div>
      <div>
        <Label className="text-xs">Card variant</Label>
        <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(block.props.cardVariant as string) ?? "default"} onChange={(e) => setProp("cardVariant", e.target.value)}>
          <option value="default">Default</option>
          <option value="bordered">Bordered</option>
          <option value="elevated">Elevated</option>
          <option value="iconTop">Icon top</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={Boolean(block.props.showCategories)} onChange={(e) => setProp("showCategories", e.target.checked)} />
        Show category filters
      </label>
      <RepeatableSection label="Features" onAdd={() => updateItems([...items, emptyGridItem()])}>
        {items.map((item) => (
          <GridItemEditor
            key={item.id}
            item={item}
            onUpdate={(patch) => updateItems(items.map((i) => (i.id === item.id ? { ...i, ...patch } : i)))}
            onRemove={() => updateItems(items.filter((i) => i.id !== item.id))}
          />
        ))}
      </RepeatableSection>
    </div>
  );
}

export function BenefitsGridBlockFields({ block, onChange }: Props) {
  const items = (block.props.items as GridItem[]) ?? [];
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));
  const updateItems = (next: GridItem[]) => setProp("items", next);

  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />
      <div>
        <Label className="text-xs">Layout</Label>
        <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(block.props.layout as string) ?? "cards"} onChange={(e) => setProp("layout", e.target.value)}>
          <option value="cards">Cards</option>
          <option value="list">List</option>
          <option value="numbered">Numbered</option>
          <option value="twoColumn">Two column</option>
        </select>
      </div>
      <div>
        <Label className="text-xs">Emphasis</Label>
        <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(block.props.emphasis as string) ?? "outcome"} onChange={(e) => setProp("emphasis", e.target.value)}>
          <option value="outcome">Outcome</option>
          <option value="metric">Metric</option>
        </select>
      </div>
      <RepeatableSection label="Benefits" onAdd={() => updateItems([...items, emptyGridItem()])}>
        {items.map((item) => (
          <GridItemEditor
            key={item.id}
            item={item}
            showMetric
            onUpdate={(patch) => updateItems(items.map((i) => (i.id === item.id ? { ...i, ...patch } : i)))}
            onRemove={() => updateItems(items.filter((i) => i.id !== item.id))}
          />
        ))}
      </RepeatableSection>
    </div>
  );
}
