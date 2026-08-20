"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { HtmlElement } from "../../types";
import { TAG_LABELS } from "../../defaults";
import { LocalizedHtmlInput } from "../localized-html-input";

type Props = {
  element: HtmlElement;
  onChange: (patch: Partial<HtmlElement>) => void;
};

export function TextElementForm({ element, onChange }: Props) {
  const tagLabel = TAG_LABELS[element.tag] ?? element.tag;
  const isHeading = /^h[1-6]$/.test(element.tag);

  return (
    <div className="space-y-3 p-3">
      <LocalizedHtmlInput
        label="Text"
        baseKey="text"
        values={element as Record<string, unknown>}
        onChange={(patch) => onChange(patch)}
        multiline
        placeholder={`${tagLabel} text…`}
      />

      {isHeading && (
        <div>
          <Label className="text-xs">ID (anchor)</Label>
          <Input
            className="mt-1 h-8 text-xs"
            placeholder="e.g. features"
            value={element.attributes?.id ?? ""}
            onChange={(e) =>
              onChange({ attributes: { ...element.attributes, id: e.target.value } })
            }
          />
        </div>
      )}
    </div>
  );
}
