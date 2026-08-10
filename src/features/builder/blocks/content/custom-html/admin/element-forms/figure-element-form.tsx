"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { IMAGE_PICKER_MEDIA_TYPES } from "@/features/media/constants";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { DEFAULT_ADMIN_LOCALE, getContentFieldSuffix } from "@/i18n/locale-config";
import type { HtmlElement } from "../../types";

type Props = {
  element: HtmlElement;
  onChange: (patch: Partial<HtmlElement>) => void;
};

export function FigureElementForm({ element, onChange }: Props) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;
  const defaultCode = adminLocale?.defaultCode ?? DEFAULT_ADMIN_LOCALE.code;
  const isDefault = activeCode === defaultCode;
  const suffix = getContentFieldSuffix(activeCode);
  const textKey = `text${suffix}`;

  const attrs = element.attributes ?? {};
  const update = (patch: Record<string, unknown>) =>
    onChange({ attributes: { ...attrs, ...patch } });

  const captionValue = (element[textKey] as string | undefined) ?? (isDefault ? (element.text ?? "") : "");

  return (
    <div className="space-y-3 p-3">
      <UrlPrimaryMediaPickerField
        label="Image"
        mediaTypes={IMAGE_PICKER_MEDIA_TYPES}
        url={attrs.src ?? ""}
        onPick={({ url, mediaId }) =>
          update({ src: url, mediaAssetId: mediaId ?? "" })
        }
      />

      <div>
        <Label className="text-xs">Alt text</Label>
        <Input
          className="mt-1 h-8 text-xs"
          placeholder="Describe the image…"
          value={attrs.alt ?? ""}
          onChange={(e) => update({ alt: e.target.value })}
        />
      </div>

      <div>
        <Label className="text-xs">Caption (figcaption)</Label>
        <textarea
          className="mt-1 w-full resize-y rounded-md border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring min-h-[60px]"
          value={captionValue}
          placeholder="Optional caption text…"
          onChange={(e) => {
            if (isDefault) {
              onChange({ text: e.target.value, [textKey]: e.target.value });
            } else {
              onChange({ [textKey]: e.target.value });
            }
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Width (px)</Label>
          <Input
            className="mt-1 h-8 text-xs"
            type="number"
            placeholder="e.g. 800"
            value={attrs.width ?? ""}
            onChange={(e) => update({ width: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
        <div>
          <Label className="text-xs">Height (px)</Label>
          <Input
            className="mt-1 h-8 text-xs"
            type="number"
            placeholder="e.g. 600"
            value={attrs.height ?? ""}
            onChange={(e) => update({ height: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={attrs.rounded ?? false}
          onChange={(e) => update({ rounded: e.target.checked })}
        />
        Rounded corners
      </label>
    </div>
  );
}
