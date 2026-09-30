export function shouldShowHeroOverlay(opts: {
  useTransparentHero?: boolean;
  useBlockVisualBg?: boolean;
  backgroundType?: string;
  imageUrl?: string;
}): boolean {
  const hasHeroImage = Boolean(opts.imageUrl);
  return (
    !opts.useTransparentHero &&
    !opts.useBlockVisualBg &&
    !(opts.backgroundType === "image" && hasHeroImage) &&
    opts.backgroundType !== "video" &&
    opts.backgroundType !== "transparent" &&
    opts.backgroundType !== "none"
  );
}
