"use client";

import type { BlockNode } from "@/types/builder";
import type {
  BlockContentOverflowSettings,
  CollapseVariant,
  ContentOverflowMode,
  DeviceBreakpoint,
} from "@/types/block-system";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { updateBlockResponsive } from "@/features/builder/components/block-style-utils";
import { blockRegistry } from "@/features/builder/registry/block-registry-system";

type Props = {
  block: BlockNode;
  device: DeviceBreakpoint;
  onChange: (block: BlockNode) => void;
};

export function ContentOverflowFields({ block, device, onChange }: Props) {
  const capable = blockRegistry.get(block.type)?.contentOverflowCapable ?? false;
  const layer = block.responsive?.[device] ?? {};
  const overflow: BlockContentOverflowSettings = layer.contentOverflow ?? {};

  const patchOverflow = (patch: Partial<BlockContentOverflowSettings>) => {
    onChange(
      updateBlockResponsive(block, device, {
        contentOverflow: { ...overflow, ...patch },
      })
    );
  };

  const mode: ContentOverflowMode = overflow.mode ?? "inherit";

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-3">
      <div>
        <Label className="text-xs font-medium">Content overflow</Label>
        {!capable && (
          <p className="mt-1 text-xs text-muted-foreground">
            This block has no multi-item layout. Controls apply only to list, grid, and carousel blocks.
          </p>
        )}
      </div>

      <div>
        <Label className="text-xs">Overflow mode</Label>
        <select
          className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm disabled:opacity-50"
          value={mode}
          disabled={!capable}
          onChange={(e) =>
            patchOverflow({ mode: e.target.value as ContentOverflowMode })
          }
        >
          <option value="inherit">Inherit (content defaults)</option>
          <option value="grid">Grid</option>
          <option value="slider">Slider</option>
          <option value="collapse">Collapse</option>
        </select>
      </div>

      {capable && mode === "slider" && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={overflow.sliderEnabled !== false}
            onChange={(e) => patchOverflow({ sliderEnabled: e.target.checked })}
          />
          Enable slider (off = grid fallback)
        </label>
      )}

      {capable && mode === "collapse" && (
        <>
          <div>
            <Label className="text-xs">Collapse variant</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={overflow.collapseVariant ?? "accordion"}
              onChange={(e) =>
                patchOverflow({ collapseVariant: e.target.value as CollapseVariant })
              }
            >
              <option value="accordion">Accordion</option>
              <option value="show_more">Show more</option>
              <option value="stack">Stack (single column)</option>
            </select>
          </div>
          {(overflow.collapseVariant ?? "accordion") === "show_more" && (
            <div>
              <Label className="text-xs">Items before expand</Label>
              <Input
                type="number"
                min={1}
                className="mt-1 h-8 text-sm"
                value={String(overflow.showMoreLimit ?? 3)}
                onChange={(e) =>
                  patchOverflow({ showMoreLimit: Number(e.target.value) || 3 })
                }
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
