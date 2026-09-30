"use client";

import { NumberField } from "@/components/admin/settings-fields";
import { cn } from "@/lib/utils";
import type { PopupFrequency, PopupFrequencyMode } from "@/features/popups/popup.schema";

const POLICIES: Array<{
  mode: PopupFrequencyMode;
  label: string;
  description: string;
}> = [
  { mode: "always", label: "Every time", description: "Always show" },
  { mode: "once", label: "Once", description: "Show only once" },
  { mode: "session", label: "Once per session", description: "Reset when the tab closes" },
  { mode: "daily", label: "Once per day", description: "Reset after 24 hours" },
  { mode: "custom", label: "Custom", description: "Advanced rules" },
];

type Props = {
  value: PopupFrequency;
  onChange: (patch: Partial<PopupFrequency>) => void;
};

export function PopupFrequencyBuilder({ value, onChange }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">How often should visitors see it?</p>
      <div className="popup-admin-policy-grid">
        {POLICIES.map((policy) => {
          const selected = value.mode === policy.mode;
          return (
            <button
              key={policy.mode}
              type="button"
              className={cn("popup-admin-policy-card", selected && "is-selected")}
              onClick={() => onChange({ mode: policy.mode })}
            >
              <span className="block text-sm font-medium">{policy.label}</span>
              <span className="block text-xs text-muted-foreground">{policy.description}</span>
            </button>
          );
        })}
      </div>
      {value.mode === "custom" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            label="Maximum impressions"
            value={value.maxImpressions}
            onChange={(maxImpressions) => onChange({ maxImpressions })}
            min={1}
            max={100}
          />
          <NumberField
            label="Cooldown (hours)"
            value={value.cooldownHours}
            onChange={(cooldownHours) => onChange({ cooldownHours })}
            min={0}
            max={720}
          />
        </div>
      ) : null}
    </div>
  );
}
