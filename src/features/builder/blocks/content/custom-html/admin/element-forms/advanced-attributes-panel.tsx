"use client";

import { useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { HtmlElement, HtmlElementTag } from "../../types";
import { TAG_LABELS } from "../../defaults";
import {
  getConvertibleTags,
  convertElementTag,
  isConvertibleTag,
} from "../../lib/convert-element-tag";
import { mergeTextAlign, mergeDirection, readTextAlign, readDirection } from "../../lib/style-attributes";

type Props = {
  element: HtmlElement;
  onChange: (patch: Partial<HtmlElement>) => void;
};

const VOID_TAGS = new Set(["br", "hr", "img", "source"]);
const STYLE_CAPABLE_TAGS = new Set(["br", "hr", "img"]);

export function AdvancedAttributesPanel({ element, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const attrs = element.attributes ?? {};
  const dataAttrs = attrs.dataAttributes ?? {};
  const dataEntries = Object.entries(dataAttrs);

  const isVoid = VOID_TAGS.has(element.tag);
  const hasStyleControls = !STYLE_CAPABLE_TAGS.has(element.tag) && !element.rawHtml;

  const update = (patch: Record<string, unknown>) =>
    onChange({ attributes: { ...attrs, ...patch } });

  const updateDataKey = (oldKey: string, newKey: string) => {
    const next = { ...dataAttrs };
    const val = next[oldKey] ?? "";
    delete next[oldKey];
    if (newKey) next[newKey] = val;
    update({ dataAttributes: next });
  };

  const updateDataValue = (key: string, value: string) => {
    update({ dataAttributes: { ...dataAttrs, [key]: value } });
  };

  const addDataAttr = () => {
    const key = `key${dataEntries.length + 1}`;
    update({ dataAttributes: { ...dataAttrs, [key]: "" } });
  };

  const removeDataAttr = (key: string) => {
    const next = { ...dataAttrs };
    delete next[key];
    update({ dataAttributes: next });
  };

  const convertibleTags = isConvertibleTag(element.tag)
    ? getConvertibleTags(element.tag)
    : [];

  const handleTagChange = (newTag: string) => {
    const converted = convertElementTag(element, newTag as HtmlElementTag);
    // Pass the full converted element fields except id (onChange takes a patch)
    onChange({
      tag: converted.tag,
      attributes: converted.attributes,
      children: converted.children,
    });
  };

  const currentTextAlign = readTextAlign(attrs.style ?? "");
  const currentDirection = readDirection(attrs.dir ?? "");

  const handleTextAlignChange = (value: string) => {
    const newStyle = mergeTextAlign(attrs.style ?? "", value);
    update({ style: newStyle });
  };

  const handleDirectionChange = (value: string) => {
    update({ dir: value === "default" ? undefined : value });
  };

  return (
    <div className="border-t">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        Advanced Attributes
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-3 px-3 pb-3">
          {/* Element type conversion */}
          <div>
            <Label className="text-xs">Element type</Label>
            {convertibleTags.length > 0 ? (
              <select
                className="mt-1 h-7 w-full rounded-md border bg-background px-2 text-xs"
                value={element.tag}
                onChange={(e) => handleTagChange(e.target.value)}
              >
                <option value={element.tag}>
                  {TAG_LABELS[element.tag] ?? `<${element.tag}>`}
                </option>
                {convertibleTags.map((t) => (
                  <option key={t} value={t}>
                    {TAG_LABELS[t] ?? `<${t}>`}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1 h-7 flex items-center text-xs text-muted-foreground">
                &lt;{element.tag}&gt; — type cannot be changed
              </p>
            )}
          </div>

          {/* Style controls */}
          {hasStyleControls && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Text align</Label>
                <select
                  className="mt-1 h-7 w-full rounded-md border bg-background px-2 text-xs"
                  value={currentTextAlign}
                  onChange={(e) => handleTextAlignChange(e.target.value)}
                >
                  <option value="default">Default</option>
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                  <option value="justify">Justify</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Direction</Label>
                <select
                  className="mt-1 h-7 w-full rounded-md border bg-background px-2 text-xs"
                  value={currentDirection}
                  onChange={(e) => handleDirectionChange(e.target.value)}
                >
                  <option value="default">Default</option>
                  <option value="ltr">LTR</option>
                  <option value="rtl">RTL</option>
                </select>
              </div>
            </div>
          )}

          {/* ID + Class */}
          {!isVoid && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">ID</Label>
                <Input
                  className="mt-1 h-7 text-xs"
                  placeholder="element-id"
                  value={attrs.id ?? ""}
                  onChange={(e) => update({ id: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Class</Label>
                <Input
                  className="mt-1 h-7 text-xs"
                  placeholder="css-class"
                  value={attrs.class ?? ""}
                  onChange={(e) => update({ class: e.target.value })}
                />
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs">Style</Label>
            <Input
              className="mt-1 h-7 text-xs font-mono"
              placeholder="color: red; font-size: 14px"
              value={attrs.style ?? ""}
              onChange={(e) => update({ style: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Title</Label>
              <Input
                className="mt-1 h-7 text-xs"
                placeholder="Tooltip text"
                value={attrs.title ?? ""}
                onChange={(e) => update({ title: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Aria-label</Label>
              <Input
                className="mt-1 h-7 text-xs"
                placeholder="Accessible label"
                value={attrs.ariaLabel ?? ""}
                onChange={(e) => update({ ariaLabel: e.target.value })}
              />
            </div>
          </div>

          {/* data-* attributes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">Data attributes</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 gap-1 text-xs"
                onClick={addDataAttr}
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>
            {dataEntries.map(([key, val]) => (
              <div key={key} className="flex items-center gap-1 mb-1">
                <Input
                  className="h-7 text-xs w-28 shrink-0"
                  placeholder="key"
                  value={key}
                  onChange={(e) => updateDataKey(key, e.target.value)}
                />
                <Input
                  className="h-7 text-xs flex-1"
                  placeholder="value"
                  value={val}
                  onChange={(e) => updateDataValue(key, e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive"
                  onClick={() => removeDataAttr(key)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
