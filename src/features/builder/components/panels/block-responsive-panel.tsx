"use client";

import type { BlockNode } from "@/types/builder";
import type { DeviceBreakpoint } from "@/types/block-system";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutPresetField } from "@/features/builder/components/fields/layout-preset-field";
import {
  MAX_WIDTH_PRESET_OPTIONS,
  MIN_HEIGHT_PRESET_OPTIONS,
  SECTION_SPACING_PRESET_OPTIONS,
  WIDTH_PRESET_OPTIONS,
} from "@/features/builder/constants/layout-presets";
import {
  inferMaxWidthPreset,
  inferMinHeightPreset,
  inferSectionSpacingPreset,
  inferWidthPreset,
} from "@/features/builder/styles/layout-preset-resolver";
import { updateBlockResponsive } from "@/features/builder/components/block-style-utils";
import { ContentOverflowFields } from "@/features/builder/components/panels/content-overflow-fields";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

const DEVICES: DeviceBreakpoint[] = ["desktop", "tablet", "mobile"];

function DevicePanel({
  block,
  device,
  onChange,
}: {
  block: BlockNode;
  device: DeviceBreakpoint;
  onChange: (block: BlockNode) => void;
}) {
  const layer = block.responsive?.[device] ?? {};
  const patch = (p: Parameters<typeof updateBlockResponsive>[2]) => {
    onChange(updateBlockResponsive(block, device, p));
  };

  const widthPreset = layer.widthPreset ?? inferWidthPreset(layer.width);
  const maxWidthPreset = layer.maxWidthPreset ?? inferMaxWidthPreset(layer.maxWidth);
  const minHeightPreset = layer.minHeightPreset ?? inferMinHeightPreset(layer.minHeight);
  const sectionSpacingPreset =
    layer.sectionSpacingPreset ?? inferSectionSpacingPreset(layer.sectionSpacing);

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(layer.hide)}
          onChange={(e) => patch({ hide: e.target.checked })}
        />
        Hide on {device}
      </label>

      {!layer.hide && (
        <>
          <div>
            <Label>Alignment</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={layer.alignment ?? ""}
              onChange={(e) =>
                patch({
                  alignment: (e.target.value || undefined) as typeof layer.alignment,
                })
              }
            >
              <option value="">Inherit</option>
              <option value="start">Start</option>
              <option value="center">Center</option>
              <option value="end">End</option>
              <option value="stretch">Stretch</option>
            </select>
          </div>

          <LayoutPresetField
            label="Width override"
            preset={widthPreset}
            customValue={String(layer.width ?? "")}
            options={WIDTH_PRESET_OPTIONS}
            onPresetChange={(widthPreset) => patch({ widthPreset })}
            onCustomChange={(width) => patch({ widthPreset: "custom", width })}
          />
          <LayoutPresetField
            label="Max width override"
            preset={maxWidthPreset}
            customValue={String(layer.maxWidth ?? "")}
            options={MAX_WIDTH_PRESET_OPTIONS}
            onPresetChange={(maxWidthPreset) => patch({ maxWidthPreset })}
            onCustomChange={(maxWidth) => patch({ maxWidthPreset: "custom", maxWidth })}
          />
          <LayoutPresetField
            label="Min height override"
            preset={minHeightPreset}
            customValue={String(layer.minHeight ?? "")}
            options={MIN_HEIGHT_PRESET_OPTIONS}
            onPresetChange={(minHeightPreset) => patch({ minHeightPreset })}
            onCustomChange={(minHeight) => patch({ minHeightPreset: "custom", minHeight })}
          />
          <LayoutPresetField
            label="Section spacing override"
            preset={sectionSpacingPreset}
            customValue={String(layer.sectionSpacing ?? "")}
            options={SECTION_SPACING_PRESET_OPTIONS}
            onPresetChange={(sectionSpacingPreset) => patch({ sectionSpacingPreset })}
            onCustomChange={(sectionSpacing) =>
              patch({ sectionSpacingPreset: "custom", sectionSpacing })
            }
          />

          <ContentOverflowFields block={block} device={device} onChange={onChange} />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Font size</Label>
              <Input
                value={String(layer.fontSize ?? "")}
                onChange={(e) => patch({ fontSize: e.target.value || undefined })}
                placeholder="inherit"
              />
            </div>
            <div>
              <Label className="text-xs">Font weight</Label>
              <Input
                value={String(layer.fontWeight ?? "")}
                onChange={(e) => patch({ fontWeight: e.target.value || undefined })}
                placeholder="inherit"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Line height</Label>
              <Input
                value={String(layer.lineHeight ?? "")}
                onChange={(e) => patch({ lineHeight: e.target.value || undefined })}
                placeholder="inherit"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function BlockResponsivePanel({ block, onChange }: Props) {
  return (
    <Tabs defaultValue="desktop">
      <TabsList className="grid w-full grid-cols-3">
        {DEVICES.map((d) => (
          <TabsTrigger key={d} value={d} className="capitalize text-xs">
            {d}
          </TabsTrigger>
        ))}
      </TabsList>
      {DEVICES.map((device) => (
        <TabsContent key={device} value={device} className="pt-3">
          <DevicePanel block={block} device={device} onChange={onChange} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
