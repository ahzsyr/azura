export type MediaPipelineInput = {
  url: string;
  mimeType?: string;
  providerId: string;
  target?: "feed" | "story" | "reel" | "carousel";
};

export type MediaPipelineResult = {
  ok: boolean;
  url: string;
  width?: number;
  height?: number;
  format?: string;
  optimized: boolean;
  message?: string;
};

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)(\?|$)/i;
const VIDEO_EXT = /\.(mp4|mov|webm)(\?|$)/i;

export function validateMediaForProvider(input: MediaPipelineInput): { ok: boolean; message?: string } {
  const isImage = Boolean(input.mimeType?.startsWith("image/") || IMAGE_EXT.test(input.url));
  const isVideo = Boolean(input.mimeType?.startsWith("video/") || VIDEO_EXT.test(input.url));
  if (!isImage && !isVideo) {
    return { ok: false, message: "Unsupported media type" };
  }
  if (input.providerId === "instagram" && input.target === "feed" && isVideo === false && isImage === false) {
    return { ok: false, message: "Instagram requires image or video" };
  }
  return { ok: true };
}

export function formatMediaForProvider(input: MediaPipelineInput): MediaPipelineResult {
  const validation = validateMediaForProvider(input);
  if (!validation.ok) {
    return { ok: false, url: input.url, optimized: false, message: validation.message };
  }

  // Foundation formatter — providers can replace with SDK uploads later.
  return {
    ok: true,
    url: input.url,
    optimized: true,
    format: input.mimeType,
    message: "Validated and prepared for provider upload",
  };
}

export async function runMediaPipeline(inputs: MediaPipelineInput[]): Promise<MediaPipelineResult[]> {
  return inputs.map((input) => formatMediaForProvider(input));
}
