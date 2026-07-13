"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { IMAGE_PICKER_MEDIA_TYPES } from "@/features/media/constants";
import type { HtmlElement } from "../../types";

type Props = {
  element: HtmlElement;
  onChange: (patch: Partial<HtmlElement>) => void;
};

export function ImageElementForm({ element, onChange }: Props) {
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

      <div>
        <Label className="text-xs">Alt text</Label>
        <Input
          className="mt-1 h-8 text-xs"
          placeholder="Describe the image…"
          value={attrs.alt ?? ""}
          onChange={(e) => update({ alt: e.target.value })}
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

      <div>
        <Label className="text-xs">Loading</Label>
        <select
          className="mt-1 h-8 w-full rounded-md border text-xs px-2"
          value={attrs.loading ?? "lazy"}
          onChange={(e) => update({ loading: e.target.value as "lazy" | "eager" })}
        >
          <option value="lazy">Lazy (recommended)</option>
          <option value="eager">Eager</option>
        </select>
      </div>

      <div>
        <Label className="text-xs">Alignment</Label>
        <select
          className="mt-1 h-8 w-full rounded-md border text-xs px-2"
          value={attrs.alignment ?? "center"}
          onChange={(e) => update({ alignment: e.target.value as "left" | "center" | "right" })}
        >
          <option value="center">Center</option>
          <option value="left">Float left</option>
          <option value="right">Float right</option>
        </select>
      </div>

      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={attrs.rounded ?? false}
          onChange={(e) => update({ rounded: e.target.checked })}
        />
        Rounded corners
      </label>

      <div>
        <Label className="text-xs">Link image (wrap in &lt;a&gt;)</Label>
        <Input
          className="mt-1 h-8 text-xs"
          placeholder="https://..."
          value={attrs.linkHref ?? ""}
          onChange={(e) => update({ linkHref: e.target.value })}
        />
      </div>

      {attrs.linkHref && (
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={attrs.linkTarget === "_blank"}
            onChange={(e) => update({ linkTarget: e.target.checked ? "_blank" : "" })}
          />
          Open in new tab
        </label>
      )}
    </div>
  );
}
