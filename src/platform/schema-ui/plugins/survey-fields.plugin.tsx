"use client";

import type { ReactNode } from "react";
import type { RenderContext } from "../manifests/types";
import { createManifest } from "../sdk/create-manifest";
import { DEFAULT_BINDING_CAPABILITIES } from "../schema/capabilities";
import { getBindingLabel } from "../schema/value-binding";
import { Label } from "@/components/ui/label";
import type { UIComponentManifest } from "../manifests/types";

function likertRender(ctx: RenderContext): ReactNode {
  const max = Number(ctx.binding.data.max ?? 5);
  const label = getBindingLabel(ctx.binding);
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            className={`h-9 w-9 rounded border text-sm ${ctx.value === n ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => ctx.onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function emojiRender(ctx: RenderContext): ReactNode {
  const options = (ctx.binding.data.options as Array<{ value: string; label: string }>) ?? [
    { value: "1", label: "😞" },
    { value: "2", label: "😐" },
    { value: "3", label: "🙂" },
    { value: "4", label: "😄" },
    { value: "5", label: "🤩" },
  ];
  return (
    <div className="space-y-1">
      <Label>{getBindingLabel(ctx.binding)}</Label>
      <div className="flex gap-2 text-2xl">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`p-1 rounded ${ctx.value === o.value ? "ring-2 ring-primary" : ""}`}
            onClick={() => ctx.onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function yesNoRender(ctx: RenderContext): ReactNode {
  return (
    <div className="space-y-1">
      <Label>{getBindingLabel(ctx.binding)}</Label>
      <div className="flex gap-2">
        {["yes", "no"].map((v) => (
          <button
            key={v}
            type="button"
            className={`px-3 py-1.5 rounded border text-sm capitalize ${ctx.value === v ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => ctx.onChange(v)}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

function matrixRender(ctx: RenderContext): ReactNode {
  const rows = (ctx.binding.data.rows as string[]) ?? ["Item 1", "Item 2"];
  const cols = (ctx.binding.data.columns as string[]) ?? ["1", "2", "3", "4", "5"];
  const value = (ctx.value as Record<string, string>) ?? {};
  return (
    <div className="space-y-2 overflow-x-auto">
      <Label>{getBindingLabel(ctx.binding)}</Label>
      <table className="text-xs border-collapse">
        <thead>
          <tr>
            <th className="p-1" />
            {cols.map((c) => (
              <th key={c} className="p-1 font-normal">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              <td className="p-1 pe-2">{row}</td>
              {cols.map((c) => (
                <td key={c} className="p-1 text-center">
                  <input
                    type="radio"
                    name={`${ctx.binding.bindingId}-${row}`}
                    checked={value[row] === c}
                    onChange={() => ctx.onChange({ ...value, [row]: c })}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const surveyLikertManifest: UIComponentManifest = createManifest({
  id: "likertField",
  name: "Likert",
  icon: "scale",
  category: "binding",
  capabilities: DEFAULT_BINDING_CAPABILITIES,
  node: { defaultProps: {} },
  renderer: { renderBinding: likertRender },
  properties: {
    groups: [
      {
        id: "general",
        label: "General",
        fields: [{ key: "label", label: "Label", type: "text", namespace: "presentation" }],
      },
      {
        id: "validation",
        label: "Scale",
        fields: [{ key: "max", label: "Max", type: "number", namespace: "data" }],
      },
    ],
  },
  defaultValue: "",
});

export const surveyEmojiManifest: UIComponentManifest = createManifest({
  id: "emojiField",
  name: "Emoji",
  icon: "smile",
  category: "binding",
  capabilities: DEFAULT_BINDING_CAPABILITIES,
  node: { defaultProps: {} },
  renderer: { renderBinding: emojiRender },
  properties: {
    groups: [
      {
        id: "general",
        label: "General",
        fields: [{ key: "label", label: "Label", type: "text", namespace: "presentation" }],
      },
    ],
  },
  defaultValue: "",
});

export const surveyYesNoManifest: UIComponentManifest = createManifest({
  id: "yesNoField",
  name: "Yes / No",
  icon: "toggle",
  category: "binding",
  capabilities: DEFAULT_BINDING_CAPABILITIES,
  node: { defaultProps: {} },
  renderer: { renderBinding: yesNoRender },
  properties: {
    groups: [
      {
        id: "general",
        label: "General",
        fields: [{ key: "label", label: "Label", type: "text", namespace: "presentation" }],
      },
    ],
  },
  defaultValue: "",
});

export const surveyMatrixManifest: UIComponentManifest = createManifest({
  id: "matrixField",
  name: "Matrix",
  icon: "grid",
  category: "binding",
  capabilities: DEFAULT_BINDING_CAPABILITIES,
  node: { defaultProps: {} },
  renderer: { renderBinding: matrixRender },
  properties: {
    groups: [
      {
        id: "general",
        label: "General",
        fields: [{ key: "label", label: "Label", type: "text", namespace: "presentation" }],
      },
    ],
  },
  defaultValue: {},
});
