"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { patchBlockMedia, patchBlockSettings } from "@/features/builder/instance/block-instance";
import { ItemCard, RepeatableSection } from "@/features/builder/blocks/content/admin/shared/repeatable-section";
import { LocalizedBlockInput, LocalizedBlockTextarea, LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import {
  emptyLocalizedItemFields,
  LocalizedItemFields,
} from "@/features/builder/blocks/marketing/admin/localized-item-fields";
import { newId, type VideoHeroSlide } from "@/features/builder/blocks/media/schemas/media-blocks";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

function emptySlide(): VideoHeroSlide {
  return {
    id: newId("slide"),
    videoUrl: "",
    videoMediaAssetId: "",
    imageUrl: "",
    imageMediaAssetId: "",
    posterUrl: "",
    ...emptyLocalizedItemFields(["caption"]),
  } as VideoHeroSlide;
}

export function VideoHeroBlockFields({ block, onChange }: Props) {
  const p = block.props;
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));
  const slides = (p.slides as VideoHeroSlide[]) ?? [];
  const mediaMode = (p.mediaMode as string) ?? "single";

  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />
      <LocalizedBlockInput block={block} field="badge" label="Badge" />
      <LocalizedBlockInput block={block} field="ctaLabel" label="Primary CTA label" />
      <Input className="h-8 text-sm" placeholder="Primary CTA URL" value={(p.ctaHref as string) ?? ""} onChange={(e) => setProp("ctaHref", e.target.value)} />
      <LocalizedBlockInput block={block} field="secondaryCtaLabel" label="Secondary CTA label" />
      <Input className="h-8 text-sm" placeholder="Secondary CTA URL" value={(p.secondaryCtaHref as string) ?? ""} onChange={(e) => setProp("secondaryCtaHref", e.target.value)} />

      <div>
        <Label className="text-xs">Media mode</Label>
        <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={mediaMode} onChange={(e) => setProp("mediaMode", e.target.value)}>
          <option value="single">Single video</option>
          <option value="featured">Featured slides</option>
        </select>
      </div>

      {mediaMode === "single" && (
        <>
          <UrlPrimaryMediaPickerField
            label="Background video"
            mediaTypes={["VIDEO"]}
            url={(p.videoUrl as string) ?? ""}
            onPick={({ url, mediaId }) =>
              onChange(
                patchBlockMedia(
                  block,
                  { urlKey: "videoUrl", mediaIdKey: "videoMediaAssetId" },
                  { url, mediaId },
                ),
              )
            }
          />
          <UrlPrimaryMediaPickerField
            label="Poster image (fallback)"
            mediaTypes={["IMAGE"]}
            url={(p.posterUrl as string) ?? ""}
            onChange={(url) => setProp("posterUrl", url)}
          />
          <div>
            <Label className="text-xs">Captions track URL (WebVTT)</Label>
            <Input className="mt-1 h-8 text-sm" value={(p.captionTrackUrl as string) ?? ""} onChange={(e) => setProp("captionTrackUrl", e.target.value)} />
          </div>
        </>
      )}

      {mediaMode === "featured" && (
        <RepeatableSection
          label="Slides"
          onAdd={() => setProp("slides", [...slides, emptySlide()])}
          empty={slides.length === 0}
        >
          {slides.map((slide, index) => (
            <ItemCard key={slide.id} onRemove={() => setProp("slides", slides.filter((s) => s.id !== slide.id))}>
              <UrlPrimaryMediaPickerField
                label="Video"
                mediaTypes={["VIDEO"]}
                url={slide.videoUrl}
                onPick={({ url, mediaId }) => {
                  const next = [...slides];
                  next[index] = { ...slide, videoUrl: url, videoMediaAssetId: mediaId ?? "" };
                  setProp("slides", next);
                }}
              />
              <LocalizedItemFields
                fields={[{ key: "caption", label: "Caption" }]}
                values={slide as unknown as Record<string, string>}
                onChange={(patch) => {
                  const next = [...slides];
                  next[index] = { ...slide, ...patch };
                  setProp("slides", next);
                }}
              />
            </ItemCard>
          ))}
        </RepeatableSection>
      )}

      <div>
        <Label className="text-xs">Layout</Label>
        <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(p.layout as string) ?? "fullBleed"} onChange={(e) => setProp("layout", e.target.value)}>
          <option value="fullBleed">Full bleed</option>
          <option value="centered">Centered</option>
          <option value="split">Split</option>
        </select>
      </div>
      <div>
        <Label className="text-xs">Min height</Label>
        <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(p.minHeight as string) ?? "70vh"} onChange={(e) => setProp("minHeight", e.target.value)}>
          <option value="50vh">50vh</option>
          <option value="70vh">70vh</option>
          <option value="85vh">85vh</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={p.autoplay !== false} onChange={(e) => setProp("autoplay", e.target.checked)} />
        Autoplay
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={p.showControls === true} onChange={(e) => setProp("showControls", e.target.checked)} />
        Show controls
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={p.muted !== false} onChange={(e) => setProp("muted", e.target.checked)} />
        Muted
      </label>
      <div>
        <Label className="text-xs">Overlay opacity (0–100)</Label>
        <Input type="number" min={0} max={100} className="mt-1 h-8 text-sm" value={(p.overlayOpacity as number) ?? 55} onChange={(e) => setProp("overlayOpacity", Number(e.target.value))} />
      </div>
    </div>
  );
}
