"use client";

import type { BlockNode } from "@/types/builder";
import { TEXT_EFFECT_OPTIONS } from "@/features/theme/effect-options";
import { updateBlockVisual } from "@/features/builder/components/block-style-utils";
import {
  CollapsibleSettingsGroup,
  EffectSelectField,
  InheritOffField,
  SectionBackgroundField,
} from "@/features/theme/components/visual-controls";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

const HEADING_EFFECT_OPTIONS = [
  { value: "inherit", label: "Inherit site / block" },
  { value: "none", label: "None" },
  ...TEXT_EFFECT_OPTIONS.filter((o) => o.value),
];

export function BlockLookAndFeelPanel({ block, onChange }: Props) {
  const visual = block.visual ?? {};
  const textMode = visual.siteEffects?.text ?? "inherit";

  return (
    <div className="space-y-4">
      <CollapsibleSettingsGroup
        title="Section background"
        description="Static color, gradient, or image behind this block."
        defaultOpen
      >
        <SectionBackgroundField
          value={visual.sectionBackground}
          onChange={(sectionBackground) =>
            onChange(updateBlockVisual(block, { sectionBackground }))
          }
        />
      </CollapsibleSettingsGroup>

      <CollapsibleSettingsGroup
        title="Site effects in this block"
        description="Opt out of global cursor or text effects inside this section."
      >
        <InheritOffField
          label="Cursor effect"
          value={visual.siteEffects?.cursor ?? "inherit"}
          onChange={(cursor) =>
            onChange(
              updateBlockVisual(block, {
                siteEffects: { ...visual.siteEffects, cursor },
              }),
            )
          }
        />
        <div className="space-y-3 pt-2">
          <label className="text-sm font-medium">Text effect</label>
          <div className="flex flex-wrap gap-2">
            {(["inherit", "off", "custom"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`rounded-md border px-3 py-1.5 text-xs ${
                  textMode === mode ? "border-primary bg-primary text-primary-foreground" : ""
                }`}
                onClick={() =>
                  onChange(
                    updateBlockVisual(block, {
                      siteEffects: { ...visual.siteEffects, text: mode },
                    }),
                  )
                }
              >
                {mode === "inherit" ? "Inherit" : mode === "off" ? "Off" : "Custom"}
              </button>
            ))}
          </div>
          {textMode === "custom" && (
            <EffectSelectField
              label="Block text effect"
              value={visual.textEffect ?? ""}
              options={TEXT_EFFECT_OPTIONS}
              onChange={(textEffect) =>
                onChange(updateBlockVisual(block, { textEffect: textEffect || null }))
              }
            />
          )}
        </div>
      </CollapsibleSettingsGroup>

      <CollapsibleSettingsGroup
        title="Heading text effect"
        description="Applies to this block's main title (hero h1, section headers)."
      >
        <EffectSelectField
          label="Heading effect"
          value={visual.headingTextEffect ?? "inherit"}
          options={HEADING_EFFECT_OPTIONS}
          onChange={(headingTextEffect) =>
            onChange(
              updateBlockVisual(block, {
                headingTextEffect: headingTextEffect as "inherit" | "none" | string,
              }),
            )
          }
        />
      </CollapsibleSettingsGroup>
    </div>
  );
}
