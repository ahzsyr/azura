export function clampOverlayOpacity(value: number): number {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function shouldShowBackgroundScrim(
  backgroundType: string,
  opts: { imageUrl?: string; videoUrl?: string; overlayOpacity: number },
): boolean {
  const isTransparent = backgroundType === "transparent" || backgroundType === "none";
  if (isTransparent) return false;
  const opacity = clampOverlayOpacity(opts.overlayOpacity);
  if (opacity <= 0) return false;
  const hasImage = backgroundType === "image" && Boolean(opts.imageUrl);
  const hasVideo = backgroundType === "video" && Boolean(opts.videoUrl);
  const hasGradient = backgroundType === "gradient";
  return hasImage || hasVideo || hasGradient;
}
