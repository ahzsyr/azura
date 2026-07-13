"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { HtmlElement } from "../../types";

type Props = {
  element: HtmlElement;
  onChange: (patch: Partial<HtmlElement>) => void;
};

export function GenericContainerForm({ element, onChange }: Props) {
  return (
    <div className="space-y-3 p-3">
      <div>
        <Label className="text-xs">Class</Label>
        <Input
          className="mt-1 h-8 text-xs"
          placeholder="CSS classes"
          value={element.attributes?.class ?? ""}
          onChange={(e) =>
            onChange({ attributes: { ...element.attributes, class: e.target.value } })
          }
        />
      </div>
      <div>
        <Label className="text-xs">ID</Label>
        <Input
          className="mt-1 h-8 text-xs"
          placeholder="element-id"
          value={element.attributes?.id ?? ""}
          onChange={(e) =>
            onChange({ attributes: { ...element.attributes, id: e.target.value } })
          }
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Use &ldquo;Add Element&rdquo; inside this container&rsquo;s children to build nested content.
      </p>
    </div>
  );
}
