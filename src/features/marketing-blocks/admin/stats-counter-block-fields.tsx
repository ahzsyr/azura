"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { ItemCard, RepeatableSection } from "@/features/content-blocks/admin/shared/repeatable-section";
import { LocalizedBlockTextarea, LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { IconNameSelect } from "@/features/marketing-blocks/admin/icon-name-select";
import {
  emptyLocalizedItemFields,
  LocalizedItemFields,
} from "@/features/marketing-blocks/admin/localized-item-fields";
import { newId, type StatItem } from "@/features/marketing-blocks/schemas/marketing-blocks";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

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
      <RepeatableSection
        label="Stats"
        onAdd={() =>
          updateItems([
            ...items,
            {
              id: newId("stat"),
              value: 0,
              prefix: "",
              suffix: "",
              icon: "chart",
              chartType: "none",
              chartData: [],
              ...emptyLocalizedItemFields(["label", "description"]),
            } as unknown as StatItem,
          ])
        }
      >
        {items.map((item) => (
          <ItemCard key={item.id} onRemove={() => updateItems(items.filter((i) => i.id !== item.id))}>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Value</Label>
                <Input type="number" className="mt-1 h-8 text-sm" value={item.value} onChange={(e) => updateItems(items.map((i) => (i.id === item.id ? { ...i, value: Number(e.target.value) } : i)))} />
              </div>
              <div>
                <Label className="text-xs">Prefix</Label>
                <Input className="mt-1 h-8 text-sm" value={item.prefix} onChange={(e) => updateItems(items.map((i) => (i.id === item.id ? { ...i, prefix: e.target.value } : i)))} />
              </div>
              <div>
                <Label className="text-xs">Suffix</Label>
                <Input className="mt-1 h-8 text-sm" value={item.suffix} onChange={(e) => updateItems(items.map((i) => (i.id === item.id ? { ...i, suffix: e.target.value } : i)))} />
              </div>
            </div>
            <IconNameSelect value={item.icon} onChange={(icon) => updateItems(items.map((i) => (i.id === item.id ? { ...i, icon } : i)))} />
            <LocalizedItemFields
              fields={[
                { key: "label", label: "Label" },
                { key: "description", label: "Description", multiline: true },
              ]}
              values={item as unknown as Record<string, string>}
              onChange={(patch) => updateItems(items.map((i) => (i.id === item.id ? { ...i, ...patch } : i)))}
            />
            <div>
              <Label className="text-xs">Chart type</Label>
              <select
                className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
                value={item.chartType ?? "none"}
                onChange={(e) => updateItems(items.map((i) => (i.id === item.id ? { ...i, chartType: e.target.value as StatItem["chartType"] } : i)))}
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
                    updateItems(
                      items.map((i) =>
                        i.id === item.id
                          ? { ...i, chartData: e.target.value.split(",").map((v) => Number(v.trim())).filter((n) => !Number.isNaN(n)) }
                          : i
                      )
                    )
                  }
                />
              </div>
            )}
          </ItemCard>
        ))}
      </RepeatableSection>
    </div>
  );
}
