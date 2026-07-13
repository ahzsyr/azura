"use client";

import type { BlockNode } from "@/types/builder";
import type { BlockStyleSettings } from "@/types/block-system";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  inferPaddingBottomPreset,
  inferPaddingTopPreset,
  inferWidthPreset,
  resolveLayoutFromPresets,
} from "@/features/builder/styles/layout-preset-resolver";
import { updateBlockStyles } from "@/features/builder/components/block-style-utils";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

export function BlockStyleLayoutPanel({ block, onChange }: Props) {
  const styles = block.styles ?? {};
  const widthPreset = styles.widthPreset ?? inferWidthPreset(styles.width);
  const maxWidthPreset = styles.maxWidthPreset ?? inferMaxWidthPreset(styles.maxWidth);
  const minHeightPreset = styles.minHeightPreset ?? inferMinHeightPreset(styles.minHeight);

  // Fully resolve styles so sectionSpacingPreset → sectionSpacing is accounted for in display.
  // Unauthored spacing must show "Default" (theme `.section-padding`), not "None".
  // Explicit "None" writes padding*Preset:"none" and zeros live padding via the style resolver.
  const resolvedForDisplay = resolveLayoutFromPresets(styles);
  const resolvedSectionSpacing = resolvedForDisplay.sectionSpacing;

  // Per-side padding — fall back to fully-resolved sectionSpacing for backward compat display
  const effectivePaddingTop = styles.paddingTop ?? resolvedSectionSpacing;
  const effectivePaddingBottom = styles.paddingBottom ?? resolvedSectionSpacing;
  const paddingTopPreset =
    styles.paddingTopPreset ?? inferPaddingTopPreset(effectivePaddingTop);
  const paddingBottomPreset =
    styles.paddingBottomPreset ?? inferPaddingBottomPreset(effectivePaddingBottom);

  const setStyles = (patch: Partial<BlockStyleSettings>) => {
    onChange(updateBlockStyles(block, patch));
  };

  return (
    <div className="space-y-4">
      <LayoutPresetField
        label="Width"
        preset={widthPreset}
        customValue={String(styles.width ?? "")}
        options={WIDTH_PRESET_OPTIONS}
        onPresetChange={(widthPreset) => setStyles({ widthPreset })}
        onCustomChange={(width) => setStyles({ widthPreset: "custom", width })}
        customPlaceholder="100%"
      />
      <LayoutPresetField
        label="Max width"
        preset={maxWidthPreset}
        customValue={String(styles.maxWidth ?? "")}
        options={MAX_WIDTH_PRESET_OPTIONS}
        onPresetChange={(maxWidthPreset) => setStyles({ maxWidthPreset })}
        onCustomChange={(maxWidth) => setStyles({ maxWidthPreset: "custom", maxWidth })}
        customPlaceholder="80rem"
      />
      <LayoutPresetField
        label="Min height"
        preset={minHeightPreset}
        customValue={String(styles.minHeight ?? "")}
        options={MIN_HEIGHT_PRESET_OPTIONS}
        onPresetChange={(minHeightPreset) => setStyles({ minHeightPreset })}
        onCustomChange={(minHeight) => setStyles({ minHeightPreset: "custom", minHeight })}
        customPlaceholder="50vh"
      />

      <div className="space-y-3 rounded-lg border p-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Block spacing
        </p>
        <LayoutPresetField
          label="Top padding"
          preset={paddingTopPreset}
          customValue={String(styles.paddingTop ?? resolvedSectionSpacing ?? "")}
          options={SECTION_SPACING_PRESET_OPTIONS}
          onPresetChange={(paddingTopPreset) => {
            // Explicit none must own spacing so `.section-padding` is suppressed on live.
            if (paddingTopPreset === "none") {
              setStyles({ paddingTopPreset, paddingTop: 0 });
              return;
            }
            setStyles({ paddingTopPreset });
          }}
          onCustomChange={(paddingTop) =>
            setStyles({ paddingTopPreset: "custom", paddingTop })
          }
          customPlaceholder="4rem"
        />
        <LayoutPresetField
          label="Bottom padding"
          preset={paddingBottomPreset}
          customValue={String(styles.paddingBottom ?? resolvedSectionSpacing ?? "")}
          options={SECTION_SPACING_PRESET_OPTIONS}
          onPresetChange={(paddingBottomPreset) => {
            if (paddingBottomPreset === "none") {
              setStyles({ paddingBottomPreset, paddingBottom: 0 });
              return;
            }
            setStyles({ paddingBottomPreset });
          }}
          onCustomChange={(paddingBottom) =>
            setStyles({ paddingBottomPreset: "custom", paddingBottom })
          }
          customPlaceholder="4rem"
        />
      </div>

      <div>
        <Label>Content spacing (gap)</Label>
        <Input
          value={String(styles.contentSpacing ?? "")}
          onChange={(e) => setStyles({ contentSpacing: e.target.value })}
          placeholder="1rem"
          className="mt-1"
        />
      </div>
    </div>
  );
}
