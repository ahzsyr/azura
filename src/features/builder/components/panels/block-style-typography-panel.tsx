"use client";

import type { BlockNode } from "@/types/builder";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FontFamilyField } from "@/features/builder/components/fields/font-family-field";
import { updateBlockStyles } from "@/features/builder/components/block-style-utils";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

export function BlockStyleTypographyPanel({ block, onChange }: Props) {
  const styles = block.styles ?? {};
  const setStyles = (patch: Parameters<typeof updateBlockStyles>[1]) => {
    onChange(updateBlockStyles(block, patch));
  };

  return (
    <div className="space-y-4">
      <FontFamilyField
        value={styles.fontFamily}
        onChange={(fontFamily) => setStyles({ fontFamily: fontFamily || undefined })}
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Font size</Label>
          <Input
            value={String(styles.fontSize ?? "")}
            onChange={(e) => setStyles({ fontSize: e.target.value })}
            placeholder="1rem"
            className="mt-1"
          />
        </div>
        <div>
          <Label>Font weight</Label>
          <Input
            value={String(styles.fontWeight ?? "")}
            onChange={(e) => setStyles({ fontWeight: e.target.value })}
            placeholder="400"
            className="mt-1"
          />
        </div>
        <div>
          <Label>Line height</Label>
          <Input
            value={String(styles.lineHeight ?? "")}
            onChange={(e) => setStyles({ lineHeight: e.target.value })}
            placeholder="1.5"
            className="mt-1"
          />
        </div>
        <div>
          <Label>Letter spacing</Label>
          <Input
            value={String(styles.letterSpacing ?? "")}
            onChange={(e) => setStyles({ letterSpacing: e.target.value })}
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <Label>Text transform</Label>
        <select
          className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          value={styles.textTransform ?? "none"}
          onChange={(e) =>
            setStyles({
              textTransform: e.target.value as NonNullable<typeof styles.textTransform>,
            })
          }
        >
          <option value="none">None</option>
          <option value="uppercase">Uppercase</option>
          <option value="lowercase">Lowercase</option>
          <option value="capitalize">Capitalize</option>
        </select>
      </div>
    </div>
  );
}
