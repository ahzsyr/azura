"use client";

import type { BlockNode } from "@/types/builder";
import { updateBlockVisibility } from "@/features/builder/components/block-style-utils";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

export function BlockVisibilityPanel({ block, onChange }: Props) {
  const v = block.visibility ?? {};

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Control who can see this block instance. Leave unchecked for no restriction.
      </p>
      <div className="grid gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={v.loggedIn === true}
            onChange={(e) =>
              onChange(updateBlockVisibility(block, { loggedIn: e.target.checked ? true : null }))
            }
          />
          Logged-in users only
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={v.loggedOut === true}
            onChange={(e) =>
              onChange(updateBlockVisibility(block, { loggedOut: e.target.checked ? true : null }))
            }
          />
          Logged-out users only
        </label>
      </div>
    </div>
  );
}
