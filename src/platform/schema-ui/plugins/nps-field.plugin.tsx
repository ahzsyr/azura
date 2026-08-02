"use client";

import type { ReactNode } from "react";
import { DEFAULT_BINDING_CAPABILITIES } from "../schema/capabilities";
import { createManifest } from "../sdk/create-manifest";
import type { RenderContext } from "../manifests/types";
import { getBindingLabel } from "../schema/value-binding";
import { cn } from "@/lib/utils";

function renderNpsBinding(ctx: RenderContext): ReactNode {
  const label = getBindingLabel(ctx.binding);
  const value = ctx.value == null || ctx.value === "" ? null : Number(ctx.value);

  if (ctx.binding.behavior.hidden) {
    return <input type="hidden" value={value == null ? "" : String(value)} readOnly />;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={label}>
        {Array.from({ length: 11 }, (_, n) => n).map((n) => (
          <button
            key={n}
            type="button"
            disabled={ctx.disabled ?? ctx.binding.behavior.disabled === true}
            className={cn(
              "h-8 min-w-8 px-1 rounded border text-xs font-medium transition-colors",
              value === n ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted",
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
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Not likely</span>
        <span>Very likely</span>
      </div>
      {ctx.error ? <p className="text-xs text-destructive">{ctx.error}</p> : null}
    </div>
  );
}

export const npsFieldPlugin = createManifest({
  id: "npsField",
  name: "NPS",
  icon: "gauge",
  category: "binding",
  capabilities: DEFAULT_BINDING_CAPABILITIES,
  node: { defaultProps: {} },
  renderer: { renderBinding: renderNpsBinding },
  properties: {
    groups: [
      {
        id: "general",
        label: "General",
        fields: [
          { key: "label", label: "Label", type: "text", namespace: "presentation" },
          { key: "helpText", label: "Help text", type: "text", namespace: "presentation" },
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
  defaultValue: "",
});
