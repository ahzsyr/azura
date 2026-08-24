"use client";

import type { BlockNode } from "@/types/builder";
import { Label } from "@/components/ui/label";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import {
  LocalizedBlockInput,
  LocalizedBlockTitle,
} from "@/features/builder/block-translation-context";

export function ShowcaseHeaderFields({
  block,
  onChange,
}: {
  block: BlockNode;
  onChange: (b: BlockNode) => void;
}) {
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));

  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockInput block={block} field="subtitle" label="Subtitle" />
      <LocalizedBlockInput block={block} field="badge" label="Badge" />
      <div>
        <Label className="text-xs">View all link</Label>
        <input
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.viewAllHref as string) ?? ""}
          onChange={(e) => setProp("viewAllHref", e.target.value)}
        />
      </div>
    </div>
  );
}
