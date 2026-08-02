"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { DEFAULT_ADMIN_LOCALE, getContentFieldSuffix } from "@/i18n/locale-config";
import type { HtmlElement } from "../../types";
import { TAG_LABELS } from "../../defaults";

type Props = {
  element: HtmlElement;
  onChange: (patch: Partial<HtmlElement>) => void;
};

export function TextElementForm({ element, onChange }: Props) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;
  const activeLocale = adminLocale?.activeLocale ?? DEFAULT_ADMIN_LOCALE;
  const defaultCode = adminLocale?.defaultCode ?? DEFAULT_ADMIN_LOCALE.code;
  const isDefault = activeCode === defaultCode;
  const suffix = getContentFieldSuffix(activeCode);
  const textKey = `text${suffix}`;

  const currentValue = (element[textKey] as string | undefined) ?? (isDefault ? (element.text ?? "") : "");
  const defaultValue = element.text ?? "";

  const tagLabel = TAG_LABELS[element.tag] ?? element.tag;
  const isHeading = /^h[1-6]$/.test(element.tag);

  return (
    <div className="space-y-3 p-3">
      <div>
        <Label className="text-xs">{isDefault ? "Text" : `Text (${activeLocale.label})`}</Label>
        <textarea
          className="mt-1 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring min-h-[72px]"
          value={currentValue}
          placeholder={
            !isDefault && !currentValue.trim() && defaultValue.trim()
              ? `Shows default on site if empty: ${defaultValue.slice(0, 60)}${defaultValue.length > 60 ? "…" : ""}`
              : `${tagLabel} text…`
          }
          onChange={(e) => {
            if (isDefault) {
              onChange({ text: e.target.value, [textKey]: e.target.value });
            } else {
              onChange({ [textKey]: e.target.value });
            }
          }}
        />
      </div>

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
