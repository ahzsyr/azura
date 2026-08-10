"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { DEFAULT_ADMIN_LOCALE, getContentFieldSuffix } from "@/i18n/locale-config";
import type { HtmlElement } from "../../types";

type Props = {
  element: HtmlElement;
  onChange: (patch: Partial<HtmlElement>) => void;
};

function buildRel(nofollow: boolean, sponsored: boolean, download: boolean): string {
  const parts: string[] = [];
  if (nofollow) parts.push("nofollow");
  if (sponsored) parts.push("sponsored");
  if (download) parts.push("noopener noreferrer");
  return parts.join(" ");
}

export function LinkElementForm({ element, onChange }: Props) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;
  const defaultCode = adminLocale?.defaultCode ?? DEFAULT_ADMIN_LOCALE.code;
  const isDefault = activeCode === defaultCode;
  const suffix = getContentFieldSuffix(activeCode);
  const textKey = `text${suffix}`;

  const attrs = element.attributes ?? {};
  const rel = attrs.rel ?? "";
  const nofollow = rel.includes("nofollow");
  const sponsored = rel.includes("sponsored");
  const download = attrs.target === "_blank";

  const updateAttrs = (patch: Record<string, unknown>) =>
    onChange({ attributes: { ...attrs, ...patch } });

  const updateRel = (nf: boolean, sp: boolean, dl: boolean) =>
    updateAttrs({ rel: buildRel(nf, sp, dl) });

  const textValue = (element[textKey] as string | undefined) ?? (isDefault ? (element.text ?? "") : "");

  return (
    <div className="space-y-3 p-3">
      <div>
        <Label className="text-xs">Link text</Label>
        <Input
          className="mt-1 h-8 text-xs"
          placeholder="Click here…"
          value={textValue}
          onChange={(e) => {
            if (isDefault) {
              onChange({ text: e.target.value, [textKey]: e.target.value });
            } else {
              onChange({ [textKey]: e.target.value });
            }
          }}
        />
      </div>

      <div>
        <Label className="text-xs">URL</Label>
        <Input
          className="mt-1 h-8 text-xs"
          placeholder="https://…"
          value={attrs.href ?? ""}
          onChange={(e) => updateAttrs({ href: e.target.value })}
        />
      </div>

      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={download}
          onChange={(e) => {
            updateAttrs({ target: e.target.checked ? "_blank" : "" });
            updateRel(nofollow, sponsored, e.target.checked);
          }}
        />
        Open in new tab
      </label>

      <div className="space-y-1">
        <Label className="text-xs">Rel attributes</Label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={nofollow}
            onChange={(e) => updateRel(e.target.checked, sponsored, download)}
          />
          nofollow
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={sponsored}
            onChange={(e) => updateRel(nofollow, e.target.checked, download)}
          />
          sponsored
        </label>
      </div>
    </div>
  );
}
