"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { LocalizedBlockTextarea, LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { IconNameSelect } from "@/features/builder/blocks/marketing/admin/icon-name-select";
import {
  emptyLocalizedItemFields,
  LocalizedItemFields,
} from "@/features/builder/blocks/marketing/admin/localized-item-fields";
import { newId, type StatItem } from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import { ModalRepeatableListEditor } from "@/features/builder/admin/shared/modal-repeatable-list-editor";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

function emptyStatItem(): StatItem {
  return {
    id: newId("stat"),
    value: 0,
    prefix: "",
    suffix: "",
    icon: "chart",
    chartType: "none",
    chartData: [],
    ...emptyLocalizedItemFields(["label", "description"]),
  } as unknown as StatItem;
}

function StatItemForm({
  item,
  onUpdate,
}: {
  item: StatItem;
  onUpdate: (patch: Partial<StatItem>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">Value</Label>
          <Input
            type="number"
            className="mt-1 h-8 text-sm"
            value={item.value}
            onChange={(e) => onUpdate({ value: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs">Prefix</Label>
          <Input
            className="mt-1 h-8 text-sm"
            value={item.prefix}
            onChange={(e) => onUpdate({ prefix: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Suffix</Label>
          <Input
            className="mt-1 h-8 text-sm"
            value={item.suffix}
            onChange={(e) => onUpdate({ suffix: e.target.value })}
          />
        </div>
      </div>
      <IconNameSelect value={item.icon} onChange={(icon) => onUpdate({ icon })} />
      <LocalizedItemFields
        fields={[
          { key: "label", label: "Label" },
          { key: "description", label: "Description", multiline: true },
        ]}
        values={item as unknown as Record<string, string>}
        onChange={(patch) => onUpdate(patch as Partial<StatItem>)}
      />
      <div>
        <Label className="text-xs">Chart type</Label>
        <select
          className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
          value={item.chartType ?? "none"}
          onChange={(e) => onUpdate({ chartType: e.target.value as StatItem["chartType"] })}
        >
          <option value="none">None</option>
          <option value="bar">Bar</option>
          <option value="donut">Donut</option>
        </select>
      </div>
      {(item.chartType === "bar" || item.chartType === "donut") && (
        <div>
          <Label className="text-xs">Chart data (comma-separated)</Label>
          <Input
            className="mt-1 h-8 text-sm"
            value={(item.chartData ?? []).join(",")}
            onChange={(e) =>
              onUpdate({
                chartData: e.target.value
                  .split(",")
                  .map((v) => Number(v.trim()))
                  .filter((n) => !Number.isNaN(n)),
              })
            }
          />
        </div>
      )}
    </div>
  );
}

export function StatsCounterBlockFields({ block, onChange }: Props) {
  const items = (block.props.items as StatItem[]) ?? [];
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));
  const updateItems = (next: StatItem[]) => setProp("items", next);

  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />
      <div>
        <Label className="text-xs">Layout</Label>
        <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(block.props.layout as string) ?? "grid"} onChange={(e) => setProp("layout", e.target.value)}>
          <option value="grid">Grid</option>
          <option value="row">Row</option>
          <option value="featuredCenter">Featured center</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={block.props.animateOnView !== false} onChange={(e) => setProp("animateOnView", e.target.checked)} />
        Animate on scroll
      </label>
      <ModalRepeatableListEditor
        items={items}
        onChange={updateItems}
        createEmpty={emptyStatItem}
        strings={{
          sectionLabel: "Stats",
          addButtonLabel: "Add stat",
          emptyLabel: "No stats yet. Click Add stat to create one.",
          dialogTitleCreate: "Add stat",
          dialogTitleEdit: "Edit stat",
          saveButtonLabelCreate: "Save stat",
          saveButtonLabelEdit: "Save stat",
        }}
        renderSummary={(item) => {
          const label = (item.labelEn as string | undefined) ?? "";
          const value = typeof item.value === "number" ? String(item.value) : "";
          const title = label.trim() ? label : "Untitled stat";
          return {
            title,
            meta: value ? [`Value: ${value}`] : [],
          };
        }}
        renderForm={(draft, onUpdate) => <StatItemForm item={draft} onUpdate={onUpdate} />}
      />
    </div>
  );
}
