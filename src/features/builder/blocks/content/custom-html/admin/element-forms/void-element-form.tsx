"use client";

import { TAG_LABELS } from "../../defaults";
import type { HtmlElement } from "../../types";

type Props = {
  element: HtmlElement;
  onChange: (patch: Partial<HtmlElement>) => void;
};

export function VoidElementForm({ element, onChange: _ }: Props) {
  const tagLabel = TAG_LABELS[element.tag] ?? element.tag;
  return (
    <div className="px-3 py-2 text-xs text-muted-foreground">
      {tagLabel} — no configurable fields
    </div>
  );
}
