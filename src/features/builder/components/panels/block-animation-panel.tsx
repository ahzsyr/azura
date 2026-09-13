"use client";

import type { BlockNode } from "@/types/builder";
import type { BlockAnimationBehavior } from "@/types/block-system";
import { Label } from "@/components/ui/label";
import { AnimationTypeField } from "@/features/builder/components/fields/animation-type-field";
import { updateBlockAnimation } from "@/features/builder/components/block-style-utils";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

export function BlockAnimationPanel({ block, onChange }: Props) {
  const animation = block.animation ?? {};

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={Boolean(animation.enabled)}
          onChange={(e) =>
            onChange(
              updateBlockAnimation(block, {
                enabled: e.target.checked,
                ...(e.target.checked ? { behavior: animation.behavior ?? "once" } : {}),
              })
            )
          }
        />
        Enable animations
      </label>

      {animation.enabled && (
        <>
          <div>
            <Label>Animation behavior</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={animation.behavior ?? "once"}
              onChange={(e) =>
                onChange(
                  updateBlockAnimation(block, {
                    behavior: e.target.value as BlockAnimationBehavior,
                  })
                )
              }
            >
              <option value="once">Play once on initial load</option>
              <option value="loop">Loop continuously</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              {animation.behavior === "loop"
                ? "Entrance animation repeats on this block."
                : "Entrance animation runs once when the block loads or enters view."}
            </p>
          </div>

          <AnimationTypeField
            label="Entrance"
            phase={animation.entrance}
            onChange={(entrance) =>
              onChange(updateBlockAnimation(block, { entrance }))
            }
          />

          <details className="rounded-md border p-3">
            <summary className="cursor-pointer text-sm font-medium">Scroll animation</summary>
            <div className="pt-3">
              <AnimationTypeField
                label="Scroll"
                phase={animation.scroll}
                onChange={(scroll) => onChange(updateBlockAnimation(block, { scroll }))}
              />
            </div>
          </details>

          <details className="rounded-md border p-3">
            <summary className="cursor-pointer text-sm font-medium">Hover animation</summary>
            <div className="pt-3">
              <AnimationTypeField
                label="Hover"
                phase={animation.hover}
                onChange={(hover) => onChange(updateBlockAnimation(block, { hover }))}
              />
            </div>
          </details>
        </>
      )}

      {!animation.enabled && (
        <p className="text-xs text-muted-foreground">
          Turn on animations to configure entrance, scroll, and hover effects for this block.
        </p>
      )}
    </div>
  );
}
