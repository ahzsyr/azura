"use client";

import type { BlockNode } from "@/types/builder";
import { ColorPickerField } from "@/features/builder/components/fields/color-picker-field";
import { updateBlockStyles } from "@/features/builder/components/block-style-utils";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

export function BlockStyleColorsPanel({ block, onChange }: Props) {
  const styles = block.styles ?? {};
  const set = (key: keyof typeof styles, value: string) => {
    onChange(updateBlockStyles(block, { [key]: value }));
  };

  return (
    <div className="space-y-4">
      <ColorPickerField
        label="Background"
        value={styles.backgroundColor ?? ""}
        onChange={(v) => set("backgroundColor", v)}
        showThemeSwatches
      />
      <ColorPickerField
        label="Text color"
        value={styles.textColor ?? ""}
        onChange={(v) => set("textColor", v)}
        showThemeSwatches
      />
      <ColorPickerField
        label="Border color"
        value={styles.borderColor ?? ""}
        onChange={(v) => set("borderColor", v)}
        showThemeSwatches
      />
      <ColorPickerField
        label="Hover background"
        value={styles.hoverBackgroundColor ?? ""}
        onChange={(v) => set("hoverBackgroundColor", v)}
        showThemeSwatches
      />
      <ColorPickerField
        label="Hover text"
        value={styles.hoverTextColor ?? ""}
        onChange={(v) => set("hoverTextColor", v)}
        showThemeSwatches
      />
    </div>
  );
}
