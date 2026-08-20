"use client";

import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { DEFAULT_ADMIN_LOCALE } from "@/i18n/locale-config";
import { Label } from "@/components/ui/label";
import type { HtmlElement } from "../types";
import { serializeElementsToHtml } from "../serialize";
import { deserializeHtml } from "../deserialize";
import { mergeSourceElements } from "../lib/merge-source";

type Props = {
  elements: HtmlElement[];
  onChange: (elements: HtmlElement[]) => void;
};

export function EditSourcePanel({ elements, onChange }: Props) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;
  const defaultCode = adminLocale?.defaultCode ?? DEFAULT_ADMIN_LOCALE.code;
  const isDefault = activeCode === defaultCode;
  const activeLabel = adminLocale?.activeLocale.label ?? DEFAULT_ADMIN_LOCALE.label;

  const sourceHtml = serializeElementsToHtml(elements, activeCode);

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const newHtml = e.target.value;
    if (newHtml === sourceHtml) return;
    const parsed = deserializeHtml(newHtml);
    onChange(mergeSourceElements(elements, parsed, activeCode, isDefault));
  };

  return (
    <div className="space-y-2 p-3">
      <Label className="text-xs text-muted-foreground">
        Edit Source HTML ({activeLabel}) — changes apply when you leave the editor
      </Label>
      <textarea
        key={`${activeCode}:${sourceHtml}`}
        className="w-full resize-y rounded-md border bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring min-h-[200px]"
        defaultValue={sourceHtml}
        onBlur={handleBlur}
        placeholder="<!-- Enter HTML -->"
        spellCheck={false}
      />
      <p className="text-[10px] text-muted-foreground">
        {isDefault
          ? "Edits update the default language and keep other locale translations when the structure still matches."
          : `Edits update ${activeLabel} text only. Switch to the default language to change structure.`}
      </p>
    </div>
  );
}
