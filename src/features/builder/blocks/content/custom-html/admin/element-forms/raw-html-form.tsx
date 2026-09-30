"use client";

import type { HtmlElement } from "../../types";
import { LocalizedHtmlInput } from "../localized-html-input";

type Props = {
  element: HtmlElement;
  onChange: (patch: Partial<HtmlElement>) => void;
};

export function RawHtmlForm({ element, onChange }: Props) {
  return (
    <div className="space-y-2 p-3">
      <LocalizedHtmlInput
        label="Raw HTML (legacy / source)"
        baseKey="rawHtml"
        values={element as Record<string, unknown>}
        onChange={(patch) => onChange(patch)}
        multiline
        placeholder="<!-- raw HTML -->"
        inputClassName="mt-1 w-full resize-y rounded-md border bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring min-h-[100px]"
      />
      <p className="text-[10px] text-muted-foreground">
        This element was migrated from legacy HTML. Edit the source directly or delete and recreate as structured elements.
        Switch the admin language tab to translate this HTML per locale.
      </p>
    </div>
  );
}
