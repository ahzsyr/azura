"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { IMAGE_PICKER_MEDIA_TYPES } from "@/features/media/constants";
import type { HtmlElement } from "../../types";
import { LocalizedHtmlInput } from "../localized-html-input";

type Props = {
  element: HtmlElement;
  onChange: (patch: Partial<HtmlElement>) => void;
};

export function FigureElementForm({ element, onChange }: Props) {
  const attrs = element.attributes ?? {};
  const update = (patch: Record<string, unknown>) =>
    onChange({ attributes: { ...attrs, ...patch } });

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

      <LocalizedHtmlInput
        label="Alt text"
        baseKey="alt"
        values={attrs as Record<string, unknown>}
        onChange={(patch) => update(patch)}
        placeholder="Describe the image…"
      />

      <LocalizedHtmlInput
        label="Caption (figcaption)"
        baseKey="text"
        values={element as Record<string, unknown>}
        onChange={(patch) => onChange(patch)}
        multiline
        placeholder="Optional caption text…"
        inputClassName="mt-1 w-full resize-y rounded-md border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring min-h-[60px]"
      />

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
