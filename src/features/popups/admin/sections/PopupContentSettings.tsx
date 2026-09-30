"use client";

import { useState } from "react";
import {
  TextAreaField,
  TextField,
  ToggleField,
} from "@/components/admin/settings-fields";
import { Label } from "@/components/ui/label";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import type { PopupItemPatch } from "@/features/popups/admin/lib/patch-popup-item";
import type { PopupItem } from "@/features/popups/popup.schema";

type Props = {
  item: PopupItem;
  onPatch: (patch: PopupItemPatch) => void;
};

export function PopupContentSettings({ item, onPatch }: Props) {
  const [showHtml, setShowHtml] = useState(Boolean(item.content.bodyHtml));

  return (
    <div className="popup-admin-section space-y-5">
      <div>
        <h3 className="text-sm font-semibold">Content</h3>
        <p className="text-xs text-muted-foreground">
          Title, message, media, and call-to-action buttons.
        </p>
      </div>

      <TextField
        label="Title"
        value={item.content.title}
        onChange={(title) => onPatch({ content: { title } })}
      />
      <TextField
        label="Subtitle"
        value={item.content.subtitle}
        onChange={(subtitle) => onPatch({ content: { subtitle } })}
      />
      <TextAreaField
        label="Message"
        value={item.content.body}
        onChange={(body) => onPatch({ content: { body } })}
        rows={3}
      />

      <div className="space-y-2">
        <ToggleField
          label="Custom HTML body"
          checked={showHtml}
          onChange={(checked) => {
            setShowHtml(checked);
            if (!checked && item.content.bodyHtml) {
              // Keep bodyHtml intact when collapsing; only clear if user empties the field.
            }
          }}
        />
        {showHtml ? (
          <TextAreaField
            label="HTML"
            description="Basic tags only. Scripts and handlers are stripped at render time."
            value={item.content.bodyHtml}
            onChange={(bodyHtml) => onPatch({ content: { bodyHtml } })}
            rows={4}
          />
        ) : null}
        {item.content.blocks.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            This popup has {item.content.blocks.length} content block
            {item.content.blocks.length === 1 ? "" : "s"} that will be preserved on save.
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Media</p>
        <UrlPrimaryMediaPickerField
          label="Image"
          value={item.content.imageUrl}
          onChange={(imageUrl) => onPatch({ content: { imageUrl } })}
        />
        <TextField
          label="Image alt text"
          value={item.content.imageAlt}
          onChange={(imageAlt) => onPatch({ content: { imageAlt } })}
        />
        <TextField
          label="Video embed URL"
          value={item.content.videoUrl}
          onChange={(videoUrl) => onPatch({ content: { videoUrl } })}
          placeholder="https://www.youtube.com/embed/…"
        />
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium">Call to action</p>
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-xs font-medium text-muted-foreground">Primary</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Label"
              value={item.content.primaryCta.label}
              onChange={(label) => onPatch({ content: { primaryCta: { label } } })}
            />
            <TextField
              label="URL"
              value={item.content.primaryCta.href}
              onChange={(href) => onPatch({ content: { primaryCta: { href } } })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <CtaVariantSelect
              value={item.content.primaryCta.variant}
              onChange={(variant) => onPatch({ content: { primaryCta: { variant } } })}
            />
            <ToggleField
              label="Open in new tab"
              checked={item.content.primaryCta.openInNewTab}
              onChange={(openInNewTab) => onPatch({ content: { primaryCta: { openInNewTab } } })}
            />
          </div>
        </div>
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-xs font-medium text-muted-foreground">Secondary</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Label"
              value={item.content.secondaryCta.label}
              onChange={(label) => onPatch({ content: { secondaryCta: { label } } })}
            />
            <TextField
              label="URL"
              value={item.content.secondaryCta.href}
              onChange={(href) => onPatch({ content: { secondaryCta: { href } } })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <CtaVariantSelect
              value={item.content.secondaryCta.variant}
              onChange={(variant) => onPatch({ content: { secondaryCta: { variant } } })}
            />
            <ToggleField
              label="Open in new tab"
              checked={item.content.secondaryCta.openInNewTab}
              onChange={(openInNewTab) =>
                onPatch({ content: { secondaryCta: { openInNewTab } } })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CtaVariantSelect({
  value,
  onChange,
}: {
  value: PopupItem["content"]["primaryCta"]["variant"];
  onChange: (v: PopupItem["content"]["primaryCta"]["variant"]) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Variant</Label>
      <select
        className="h-9 w-full rounded-md border px-2 text-sm"
        value={value}
        onChange={(e) =>
          onChange(e.target.value as PopupItem["content"]["primaryCta"]["variant"])
        }
      >
        <option value="primary">Primary</option>
        <option value="secondary">Secondary</option>
        <option value="outline">Outline</option>
        <option value="ghost">Ghost</option>
      </select>
    </div>
  );
}
