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
import { newId, type TrustBadgeItem } from "@/features/marketing-blocks/schemas/marketing-blocks";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

export function TrustBadgesBlockFields({ block, onChange }: Props) {
  const items = (block.props.items as TrustBadgeItem[]) ?? [];
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));
  const updateItems = (next: TrustBadgeItem[]) => setProp("items", next);

  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />
      <div>
        <Label className="text-xs">Layout</Label>
        <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(block.props.layout as string) ?? "grid"} onChange={(e) => setProp("layout", e.target.value)}>
          <option value="grid">Grid</option>
          <option value="inlineStrip">Inline strip</option>
          <option value="compactRow">Compact row</option>
        </select>
      </div>
      <div>
        <Label className="text-xs">Registration number</Label>
        <Input className="mt-1 h-8 text-sm" value={(block.props.registrationNo as string) ?? ""} onChange={(e) => setProp("registrationNo", e.target.value)} />
      </div>
      <RepeatableSection
        label="Badges"
        onAdd={() =>
          updateItems([
            ...items,
            {
              id: newId("tb"),
              icon: "shield",
              imageUrl: "",
              mediaAssetId: "",
              href: "",
              ...emptyLocalizedItemFields(["label", "description"]),
            } as TrustBadgeItem,
          ])
        }
      >
        {items.map((item) => (
          <ItemCard key={item.id} onRemove={() => updateItems(items.filter((i) => i.id !== item.id))}>
            <IconNameSelect value={item.icon} onChange={(icon) => updateItems(items.map((i) => (i.id === item.id ? { ...i, icon } : i)))} />
            <MediaPickerField
              label="Seal image (optional)"
              mediaTypes={["IMAGE", "SVG"]}
              mediaId={item.mediaAssetId || null}
              url={item.imageUrl}
              onChange={({ mediaId, url }) =>
                updateItems(items.map((i) => (i.id === item.id ? { ...i, imageUrl: url, mediaAssetId: mediaId ?? "" } : i)))
              }
            />
            <LocalizedItemFields
              fields={[
                { key: "label", label: "Label" },
                { key: "description", label: "Description", multiline: true },
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
