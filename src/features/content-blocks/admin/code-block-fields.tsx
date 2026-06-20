"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { CODE_LANGUAGES } from "@/features/content-blocks/lib/highlight-code";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

export function CodeBlockFields({ block, onChange }: Props) {
  const setProp = (key: string, value: unknown) => {
    onChange(patchBlockSettings(block, { [key]: value }));
  };

  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <div>
        <Label className="text-xs">Language</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.language as string) ?? "typescript"}
          onChange={(e) => setProp("language", e.target.value)}
        >
          {CODE_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs">Code</Label>
        <textarea
          className="w-full border rounded-md p-2 text-sm font-mono mt-1 min-h-[160px]"
          value={(block.props.code as string) ?? ""}
          onChange={(e) => setProp("code", e.target.value)}
          spellCheck={false}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.showLineNumbers !== false}
          onChange={(e) => setProp("showLineNumbers", e.target.checked)}
        />
        Show line numbers
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.showCopyButton !== false}
          onChange={(e) => setProp("showCopyButton", e.target.checked)}
        />
        Show copy button
      </label>
      <div>
        <Label className="text-xs">Highlight lines (comma-separated)</Label>
        <Input
          placeholder="1, 3, 5"
          value={((block.props.highlightLines as number[]) ?? []).join(", ")}
          onChange={(e) => {
            const nums = e.target.value
              .split(",")
              .map((s) => Number(s.trim()))
              .filter((n) => Number.isFinite(n) && n > 0);
            setProp("highlightLines", nums);
          }}
        />
      </div>
    </div>
  );
}
