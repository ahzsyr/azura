"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { newId } from "@/features/content-blocks/schemas/content-blocks";
import { ItemCard, RepeatableSection } from "@/features/content-blocks/admin/shared/repeatable-section";
import {
  emptyLocalizedItemFields,
  LocalizedItemFields,
} from "@/features/marketing-blocks/admin/localized-item-fields";

type TimelineItem = {
  id: string;
  date: string;
  icon: string;
  imageUrl: string;
  [key: string]: string;
};

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

function emptyTimelineItem(): TimelineItem {
  return {
    id: newId("tl"),
    date: "",
    icon: "",
    imageUrl: "",
    ...emptyLocalizedItemFields(["title", "description", "category"]),
  };
}

export function TimelineBlockFields({ block, onChange }: Props) {
  const items = (block.props.items as TimelineItem[]) ?? [];

  const setProp = (key: string, value: unknown) => {
    onChange(patchBlockSettings(block, { [key]: value }));
  };

  const updateItems = (next: TimelineItem[]) => setProp("items", next);

  const updateItem = (id: string, patch: Partial<TimelineItem>) => {
    updateItems(
      items.map((item) => (item.id === id ? ({ ...item, ...patch } as TimelineItem) : item)),
    );
  };

  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <div>
        <Label className="text-xs">Layout</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.layout as string) ?? "vertical"}
          onChange={(e) => setProp("layout", e.target.value)}
        >
          <option value="vertical">Vertical</option>
          <option value="horizontal">Horizontal</option>
          <option value="alternating">Alternating</option>
        </select>
      </div>
      <RepeatableSection
        label="Events"
        onAdd={() => updateItems([...items, emptyTimelineItem()])}
      >
        {items.map((item) => (
          <ItemCard key={item.id} onRemove={() => updateItems(items.filter((i) => i.id !== item.id))}>
            <Input
              type="date"
              value={item.date}
              onChange={(e) => updateItem(item.id, { date: e.target.value })}
            />
            <LocalizedItemFields
              fields={[
                { key: "title", label: "Title" },
                { key: "description", label: "Description", multiline: true },
                { key: "category", label: "Category" },
              ]}
              values={item}
              onChange={(patch) => updateItem(item.id, patch as Partial<TimelineItem>)}
            />
            <Input
              placeholder="Icon emoji"
              value={item.icon}
              onChange={(e) => updateItem(item.id, { icon: e.target.value })}
            />
            <Input
              placeholder="Image URL"
              value={item.imageUrl}
              onChange={(e) => updateItem(item.id, { imageUrl: e.target.value })}
            />
          </ItemCard>
        ))}
      </RepeatableSection>
    </div>
  );
}
