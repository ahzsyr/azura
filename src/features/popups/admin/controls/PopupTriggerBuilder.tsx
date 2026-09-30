"use client";

import { NumberField, TextField } from "@/components/admin/settings-fields";
import { cn } from "@/lib/utils";
import type { PopupTrigger, PopupTriggerType } from "@/features/popups/popup.schema";

const OPTIONS: Array<{
  type: PopupTriggerType;
  label: string;
  description: string;
}> = [
  {
    type: "pageLoad",
    label: "Immediately when the page loads",
    description: "Show as soon as the page is ready",
  },
  {
    type: "delayMs",
    label: "After a delay",
    description: "Wait before showing",
  },
  {
    type: "scrollPercent",
    label: "After scrolling",
    description: "Show after the visitor scrolls",
  },
  {
    type: "exitIntent",
    label: "When the visitor is leaving",
    description: "Exit intent near the top of the page",
  },
  {
    type: "click",
    label: "When an element is clicked",
    description: "Match a CSS selector",
  },
];

type Props = {
  value: PopupTrigger;
  onChange: (patch: Partial<PopupTrigger>) => void;
};

export function PopupTriggerBuilder({ value, onChange }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">When should it appear?</p>
      <div className="space-y-2">
        {OPTIONS.map((option) => {
          const selected = value.type === option.type;
          return (
            <div key={option.type} className="space-y-2">
              <button
                type="button"
                className={cn("popup-admin-radio-row", selected && "is-selected")}
                onClick={() => onChange({ type: option.type })}
              >
                <span className={cn("popup-admin-radio-dot", selected && "is-selected")} />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">{option.description}</span>
                </span>
              </button>
              {selected && option.type === "delayMs" ? (
                <div className="ml-8">
                  <NumberField
                    label="Show after (seconds)"
                    value={Math.round(value.value / 1000)}
                    onChange={(seconds) => onChange({ value: Math.max(0, seconds) * 1000 })}
                    min={0}
                    max={300}
                  />
                </div>
              ) : null}
              {selected && option.type === "scrollPercent" ? (
                <div className="ml-8">
                  <NumberField
                    label="Show after (% of page)"
                    value={value.value}
                    onChange={(pct) => onChange({ value: pct })}
                    min={0}
                    max={100}
                  />
                </div>
              ) : null}
              {selected && option.type === "click" ? (
                <div className="ml-8">
                  <TextField
                    label="CSS selector"
                    value={value.clickSelector}
                    onChange={(clickSelector) => onChange({ clickSelector })}
                    placeholder=".pricing-button"
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
