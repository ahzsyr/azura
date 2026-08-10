"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { IMAGE_PICKER_MEDIA_TYPES } from "@/features/media/constants";
import type { HtmlElement } from "../../types";

type Source = { media?: string; src: string; mediaAssetId?: string };

type Props = {
  element: HtmlElement;
  onChange: (patch: Partial<HtmlElement>) => void;
};

const DEFAULT_SOURCES: Source[] = [
  { media: "(max-width: 640px)", src: "", mediaAssetId: "" },
  { media: "(max-width: 1024px)", src: "", mediaAssetId: "" },
];

export function PictureElementForm({ element, onChange }: Props) {
  const attrs = element.attributes ?? {};
  const sources: Source[] = (attrs.sources as Source[] | undefined) ?? DEFAULT_SOURCES;

  const updateAttrs = (patch: Record<string, unknown>) =>
    onChange({ attributes: { ...attrs, ...patch } });

  const updateSource = (index: number, patch: Partial<Source>) => {
    const next = sources.map((s, i) => (i === index ? { ...s, ...patch } : s));
    updateAttrs({ sources: next });
  };

  const addSource = () => updateAttrs({ sources: [...sources, { media: "", src: "" }] });
  const removeSource = (index: number) =>
    updateAttrs({ sources: sources.filter((_, i) => i !== index) });

  return (
    <div className="space-y-4 p-3">
      <div>
        <p className="text-xs font-medium mb-2">Sources (responsive breakpoints)</p>
        <div className="space-y-3">
          {sources.map((source, idx) => (
            <div key={idx} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Source {idx + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive"
                  onClick={() => removeSource(idx)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div>
                <Label className="text-xs">Media query</Label>
                <Input
                  className="mt-1 h-8 text-xs"
                  placeholder="e.g. (max-width: 640px)"
                  value={source.media ?? ""}
                  onChange={(e) => updateSource(idx, { media: e.target.value })}
                />
              </div>
              <UrlPrimaryMediaPickerField
                label="Image"
                mediaTypes={IMAGE_PICKER_MEDIA_TYPES}
                url={source.src}
                onPick={({ url, mediaId }) =>
                  updateSource(idx, { src: url, mediaAssetId: mediaId ?? "" })
                }
              />
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 w-full text-xs gap-1.5"
          onClick={addSource}
        >
          <Plus className="h-3 w-3" />
          Add source
        </Button>
      </div>

      <div className="border-t pt-4 space-y-3">
        <p className="text-xs font-medium">Fallback image (default)</p>
        <UrlPrimaryMediaPickerField
          label="Fallback image"
          mediaTypes={IMAGE_PICKER_MEDIA_TYPES}
          url={attrs.src ?? ""}
          onPick={({ url, mediaId }) =>
            updateAttrs({ src: url, mediaAssetId: mediaId ?? "" })
          }
        />
        <div>
          <Label className="text-xs">Alt text</Label>
          <Input
            className="mt-1 h-8 text-xs"
            placeholder="Describe the image…"
            value={attrs.alt ?? ""}
            onChange={(e) => updateAttrs({ alt: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
