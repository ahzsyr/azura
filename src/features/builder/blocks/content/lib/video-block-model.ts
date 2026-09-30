import {
  normalizeImageBlockSettings,
  shouldRenderImageBlock,
  type ImageBlockModel,
  type NormalizeImageBlockOptions,
} from "@/features/builder/blocks/content/lib/image-block-model";

export type VideoBlockModel = ImageBlockModel;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Normalize video block settings into the shared media+content model.
 * Legacy `caption` maps to `description` when description is empty.
 * Missing aspect ratio defaults to 16/9 (previous iframe aspect-video).
 */
export function normalizeVideoBlockSettings(
  raw: Record<string, unknown>,
  options: NormalizeImageBlockOptions = {},
): VideoBlockModel {
  const description = asString(raw.description) || asString(raw.caption);
  const url = asString(raw.url) || asString(raw.videoUrl);
  const mediaAssetId = asString(raw.mediaAssetId) || asString(raw.videoMediaAssetId);

  const merged: Record<string, unknown> = {
    ...raw,
    url,
    mediaAssetId,
    description,
    // Preserve legacy visual: bare video embeds were aspect-video.
    mediaAspectRatio: raw.mediaAspectRatio ?? "16/9",
  };

  return normalizeImageBlockSettings(merged, options);
}

export function shouldRenderVideoBlock(model: VideoBlockModel): boolean {
  return shouldRenderImageBlock(model);
}

export function resolveVideoBlockOmitHeights(
  props: Record<string, unknown>,
  loc?: NormalizeImageBlockOptions["loc"],
): boolean {
  return normalizeVideoBlockSettings(props, { loc }).omitHeights;
}
