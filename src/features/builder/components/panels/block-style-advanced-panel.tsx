"use client";

import type { BlockNode } from "@/types/builder";
import type { BlockStyleSettings } from "@/types/block-system";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { updateBlockStyles } from "@/features/builder/components/block-style-utils";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

export function BlockStyleAdvancedPanel({ block, onChange }: Props) {
  const styles = block.styles ?? {};
  const setStyles = (patch: Partial<BlockStyleSettings>) => {
    onChange(updateBlockStyles(block, patch));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Custom CSS class</Label>
        <Input
          value={styles.className ?? ""}
          onChange={(e) => setStyles({ className: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <Label>Custom inline CSS</Label>
        <Input
          value={styles.inlineCss ?? ""}
          onChange={(e) => setStyles({ inlineCss: e.target.value })}
          placeholder="padding: 2rem;"
          className="mt-1 font-mono text-xs"
        />
      </div>
      <div>
        <Label>Position</Label>
        <select
          className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          value={styles.position ?? "relative"}
          onChange={(e) =>
            setStyles({ position: e.target.value as BlockStyleSettings["position"] })
          }
        >
          <option value="relative">Relative</option>
          <option value="absolute">Absolute</option>
          <option value="sticky">Sticky</option>
          <option value="fixed">Fixed</option>
        </select>
      </div>
      <div>
        <Label>Z-index</Label>
        <Input
          type="number"
          value={styles.zIndex ?? ""}
          onChange={(e) =>
            setStyles({ zIndex: e.target.value ? Number(e.target.value) : undefined })
          }
          className="mt-1"
        />
      </div>
      <div>
        <Label>Overflow</Label>
        <select
          className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          value={styles.overflow ?? "visible"}
          onChange={(e) =>
            setStyles({ overflow: e.target.value as BlockStyleSettings["overflow"] })
          }
        >
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
          <option value="auto">Auto</option>
          <option value="scroll">Scroll</option>
        </select>
      </div>
    </div>
  );
}
