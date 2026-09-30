"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { newId } from "@/features/builder/blocks/content/schemas/content-blocks";
import { ModalRepeatableListEditor } from "@/features/builder/admin/shared/modal-repeatable-list-editor";
import {
  emptyLocalizedItemFields,
  LocalizedItemFields,
} from "@/features/builder/blocks/marketing/admin/localized-item-fields";

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
      <ModalRepeatableListEditor
        items={items}
        onChange={updateItems}
        createEmpty={emptyTimelineItem}
        strings={{
          sectionLabel: "Events",
          addButtonLabel: "Add event",
          emptyLabel: "No events yet. Click Add event to create one.",
          dialogTitleCreate: "Add event",
          dialogTitleEdit: "Edit event",
          saveButtonLabelCreate: "Save event",
          saveButtonLabelEdit: "Save event",
        }}
        renderSummary={(item) => ({
          title: ((item.titleEn as string | undefined) ?? "").trim() || "Untitled event",
          meta: [item.date ? `Date: ${item.date}` : "", item.categoryEn ? `Category: ${item.categoryEn}` : ""].filter(Boolean),
        })}
        renderForm={(draft, onUpdate) => (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                className="mt-1"
                value={draft.date}
                onChange={(e) => onUpdate({ date: e.target.value })}
              />
            </div>
            <LocalizedItemFields
              fields={[
                { key: "title", label: "Title" },
                { key: "description", label: "Description", multiline: true },
                { key: "category", label: "Category" },
              ]}
              values={draft}
              onChange={(patch) => onUpdate(patch as Partial<TimelineItem>)}
            />
            <Input
              placeholder="Icon emoji"
              value={draft.icon}
              onChange={(e) => onUpdate({ icon: e.target.value })}
            />
            <Input
              placeholder="Image URL"
              value={draft.imageUrl}
              onChange={(e) => onUpdate({ imageUrl: e.target.value })}
            />
          </div>
        )}
      />
    </div>
  );
}
