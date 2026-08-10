"use client";

import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { DEFAULT_ADMIN_LOCALE, getContentFieldSuffix } from "@/i18n/locale-config";
import { Label } from "@/components/ui/label";
import type { HtmlElement } from "../types";
import { serializeElementsToHtml } from "../serialize";
import { deserializeHtml } from "../deserialize";

type Props = {
  elements: HtmlElement[];
  onChange: (elements: HtmlElement[]) => void;
};

export function EditSourcePanel({ elements, onChange }: Props) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;

  const sourceHtml = serializeElementsToHtml(elements, activeCode);

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const newHtml = e.target.value;
    const parsed = deserializeHtml(newHtml);
    onChange(parsed);
  };

  return (
    <div className="space-y-2 p-3">
      <Label className="text-xs text-muted-foreground">
        Edit Source HTML — changes apply when you leave the editor
      </Label>
      <textarea
        key={sourceHtml} // remount when elements change externally
        className="w-full resize-y rounded-md border bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring min-h-[200px]"
        defaultValue={sourceHtml}
        onBlur={handleBlur}
        placeholder="<!-- Enter HTML -->"
        spellCheck={false}
      />
      <p className="text-[10px] text-muted-foreground">
        Edits are parsed back to structured elements when you toggle back to Visual mode.
        Unsupported tags will be wrapped in raw div elements.
      </p>
    </div>
  );
}
