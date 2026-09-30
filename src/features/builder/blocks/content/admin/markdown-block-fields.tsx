"use client";

import type { BlockNode } from "@/types/builder";
import { Label } from "@/components/ui/label";
import { LocalizedBlockTextarea } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

export function MarkdownBlockFields({ block, onChange }: Props) {
  const setProp = (key: string, value: unknown) => {
    onChange(patchBlockSettings(block, { [key]: value }));
  };

  return (
    <div className="space-y-3">
      <LocalizedBlockTextarea block={block} field="markdown" label="Markdown" rows={10} />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.prose !== false}
          onChange={(e) => setProp("prose", e.target.checked)}
        />
        Apply prose styles
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.allowGfm !== false}
          onChange={(e) => setProp("allowGfm", e.target.checked)}
        />
        GitHub Flavored Markdown (tables, task lists)
      </label>
      <div className="rounded-lg border p-3 bg-muted/30">
        <Label className="text-xs text-muted-foreground">Preview</Label>
        <pre className="mt-2 text-xs whitespace-pre-wrap font-mono max-h-40 overflow-auto">
          {(block.props.markdownEn as string) || "No content"}
        </pre>
      </div>
    </div>
  );
}
