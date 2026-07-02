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
  inferSectionSpacingPreset,
  inferWidthPreset,
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
  const sectionSpacingPreset =
    styles.sectionSpacingPreset ?? inferSectionSpacingPreset(styles.sectionSpacing);

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
      <LayoutPresetField
        label="Section spacing"
        preset={sectionSpacingPreset}
        customValue={String(styles.sectionSpacing ?? "")}
        options={SECTION_SPACING_PRESET_OPTIONS}
        onPresetChange={(sectionSpacingPreset) => setStyles({ sectionSpacingPreset })}
        onCustomChange={(sectionSpacing) =>
          setStyles({ sectionSpacingPreset: "custom", sectionSpacing })
        }
        customPlaceholder="4rem"
      />

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
