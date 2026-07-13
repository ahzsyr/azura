"use client";

import { Label } from "@/components/ui/label";
import type { HtmlElement } from "../../types";

type Props = {
  element: HtmlElement;
  onChange: (patch: Partial<HtmlElement>) => void;
};

export function RawHtmlForm({ element, onChange }: Props) {
  return (
    <div className="space-y-2 p-3">
      <Label className="text-xs">Raw HTML (legacy / source)</Label>
      <textarea
        className="w-full resize-y rounded-md border bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring min-h-[100px]"
        value={element.rawHtml ?? ""}
        placeholder="<!-- raw HTML -->"
        onChange={(e) => onChange({ rawHtml: e.target.value })}
      />
      <p className="text-[10px] text-muted-foreground">
        This element was migrated from legacy HTML. Edit the source directly or delete and recreate as structured elements.
      </p>
    </div>
  );
}
