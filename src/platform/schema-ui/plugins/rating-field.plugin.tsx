"use client";

import type { ReactNode } from "react";
import { DEFAULT_BINDING_CAPABILITIES } from "../schema/capabilities";
import { createManifest } from "../sdk/create-manifest";
import type { RenderContext } from "../manifests/types";
import { getBindingLabel } from "../schema/value-binding";
import { cn } from "@/lib/utils";

function renderRatingBinding(ctx: RenderContext): ReactNode {
  const max = Math.min(Math.max(Number(ctx.binding.data.max ?? 5), 3), 10);
  const label = getBindingLabel(ctx.binding);
  const value = Number(ctx.value ?? 0);

  if (ctx.binding.behavior.hidden) {
    return <input type="hidden" value={String(value)} readOnly />;
  }

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            disabled={ctx.disabled ?? ctx.binding.behavior.disabled === true}
            className={cn(
              "h-9 w-9 rounded-md border text-sm font-medium transition-colors",
              n <= value ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted",
            )}
            onClick={() => ctx.onChange(n)}
            onBlur={ctx.onBlur}
            aria-checked={value === n}
            role="radio"
          >
            {n}
          </button>
        ))}
      </div>
      {ctx.error ? <p className="text-xs text-destructive">{ctx.error}</p> : null}
    </div>
  );
}

export const ratingFieldPlugin = createManifest({
  id: "ratingField",
  name: "Rating",
  icon: "star",
  category: "binding",
  capabilities: DEFAULT_BINDING_CAPABILITIES,
  node: { defaultProps: {} },
  renderer: { renderBinding: renderRatingBinding },
  properties: {
    groups: [
      {
        id: "general",
        label: "General",
        fields: [
          { key: "label", label: "Label", type: "text", namespace: "presentation" },
          { key: "helpText", label: "Help text", type: "text", namespace: "presentation" },
          { key: "max", label: "Max rating", type: "number", namespace: "data" },
        ],
      },
      {
        id: "behavior",
        label: "Behavior",
        fields: [
          { key: "required", label: "Required", type: "boolean", namespace: "behavior" },
          { key: "hidden", label: "Hidden", type: "boolean", namespace: "behavior" },
        ],
      },
    ],
  },
  validators: ["required"],
  defaultValue: 0,
});
