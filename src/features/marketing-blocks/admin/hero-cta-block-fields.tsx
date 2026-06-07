"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaPickerField } from "@/features/media/components/media-picker-field";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import {
  LocalizedBlockInput,
  LocalizedBlockTextarea,
  LocalizedBlockTitle,
} from "@/features/builder/block-translation-context";
import { BlockBackgroundSettings } from "@/features/marketing-blocks/admin/block-background-settings";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

export function HeroProBlockFields({ block, onChange }: Props) {
  const p = block.props;
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));

  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockInput block={block} field="badge" label="Badge" />
      <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Layout</Label>
          <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(p.layout as string) ?? "centered"} onChange={(e) => setProp("layout", e.target.value)}>
            <option value="centered">Centered</option>
            <option value="splitImageLeft">Split — image left</option>
            <option value="splitImageRight">Split — image right</option>
            <option value="fullBleed">Full bleed</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Align</Label>
          <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(p.align as string) ?? "center"} onChange={(e) => setProp("align", e.target.value)}>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Min height</Label>
          <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(p.minHeight as string) ?? "70vh"} onChange={(e) => setProp("minHeight", e.target.value)}>
            <option value="50vh">50vh</option>
            <option value="70vh">70vh</option>
            <option value="85vh">85vh</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Background type</Label>
          <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(p.backgroundType as string) ?? "image"} onChange={(e) => setProp("backgroundType", e.target.value)}>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="gradient">Gradient</option>
            <option value="transparent">Transparent</option>
          </select>
        </div>
      </div>
      <MediaPickerField
        label="Background image"
        mediaTypes={["IMAGE", "SVG"]}
        mediaId={(p.mediaAssetId as string) || null}
        url={(p.imageUrl as string) ?? ""}
        onChange={({ mediaId, url }) => onChange(patchBlockSettings(block, { imageUrl: url, mediaAssetId: mediaId ?? "" }))}
      />
      <MediaPickerField
        label="Foreground image (split layouts)"
        mediaTypes={["IMAGE", "SVG"]}
        mediaId={(p.foregroundMediaAssetId as string) || null}
        url={(p.foregroundImageUrl as string) ?? ""}
        onChange={({ mediaId, url }) => onChange(patchBlockSettings(block, { foregroundImageUrl: url, foregroundMediaAssetId: mediaId ?? "" }))}
      />
      <div>
        <Label className="text-xs">Video URL</Label>
        <Input className="mt-1 h-8 text-sm" value={(p.videoUrl as string) ?? ""} onChange={(e) => setProp("videoUrl", e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">Overlay opacity (0–100)</Label>
        <Input type="number" min={0} max={100} className="mt-1 h-8 text-sm" value={(p.overlayOpacity as number) ?? 60} onChange={(e) => setProp("overlayOpacity", Number(e.target.value))} />
      </div>
      <LocalizedBlockInput block={block} field="ctaLabel" label="Primary CTA label" />
      <Input placeholder="Primary CTA link" value={(p.ctaHref as string) ?? ""} onChange={(e) => setProp("ctaHref", e.target.value)} />
      <LocalizedBlockInput block={block} field="secondaryCtaLabel" label="Secondary CTA label" />
      <Input placeholder="Secondary CTA link" value={(p.secondaryCtaHref as string) ?? ""} onChange={(e) => setProp("secondaryCtaHref", e.target.value)} />
    </div>
  );
}

export function CtaBannerBlockFields({ block, onChange }: Props) {
  const p = block.props;
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));

  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />
      <LocalizedBlockInput block={block} field="promoBadge" label="Promo badge" />
      <LocalizedBlockInput block={block} field="promoText" label="Promo text" />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Layout</Label>
          <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(p.layout as string) ?? "centered"} onChange={(e) => setProp("layout", e.target.value)}>
            <option value="centered">Centered</option>
            <option value="split">Split</option>
            <option value="inline">Inline</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Size</Label>
          <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(p.size as string) ?? "default"} onChange={(e) => setProp("size", e.target.value)}>
            <option value="compact">Compact</option>
            <option value="default">Default</option>
            <option value="large">Large</option>
          </select>
        </div>
      </div>
      <BlockBackgroundSettings block={block} onChange={onChange} />
      <LocalizedBlockInput block={block} field="button" label="Primary button" />
      <Input placeholder="Primary link" value={(p.href as string) ?? ""} onChange={(e) => setProp("href", e.target.value)} />
      <LocalizedBlockInput block={block} field="secondaryButton" label="Secondary button" />
      <Input placeholder="Secondary link" value={(p.secondaryHref as string) ?? ""} onChange={(e) => setProp("secondaryHref", e.target.value)} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={Boolean(p.countdownEnabled)} onChange={(e) => setProp("countdownEnabled", e.target.checked)} />
        Enable countdown
      </label>
      {Boolean(p.countdownEnabled) && (
        <>
          <div>
            <Label className="text-xs">Countdown target (ISO date)</Label>
            <Input type="datetime-local" className="mt-1 h-8 text-sm" value={(p.countdownTarget as string)?.slice(0, 16) ?? ""} onChange={(e) => setProp("countdownTarget", new Date(e.target.value).toISOString())} />
          </div>
          <LocalizedBlockInput block={block} field="countdownLabel" label="Countdown label" />
        </>
      )}
    </div>
  );
}
