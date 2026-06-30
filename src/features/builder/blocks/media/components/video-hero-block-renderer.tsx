import type { Locale } from "@/i18n/routing";
import { getLocalizedField } from "@/lib/utils";
import { parseVideoHeroProps } from "@/features/builder/blocks/media/lib/parse-block-props";
import { VideoHeroView } from "@/features/builder/blocks/media/components/video-hero-view";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
  overlayClass?: string;
};

export function VideoHeroBlockRenderer({ locale, props: raw, overlayClass }: Props) {
  const p = parseVideoHeroProps(raw);
  const secondaryLabel = getLocalizedField(p, "secondaryCtaLabel", locale);

  return (
    <VideoHeroView
      title={getLocalizedField(p, "title", locale)}
      subtitle={getLocalizedField(p, "subtitle", locale) || undefined}
      badge={getLocalizedField(p, "badge", locale) || undefined}
      primaryCta={
        getLocalizedField(p, "ctaLabel", locale) && p.ctaHref
          ? { label: getLocalizedField(p, "ctaLabel", locale), href: p.ctaHref }
          : undefined
      }
      secondaryCta={
        secondaryLabel && p.secondaryCtaHref
          ? {
              label: secondaryLabel,
              href: p.secondaryCtaHref,
              variant: p.secondaryCtaVariant,
            }
          : undefined
      }
      mediaMode={p.mediaMode}
      videoUrl={p.videoUrl}
      posterUrl={p.posterUrl}
      captionTrackUrl={p.captionTrackUrl}
      slides={p.slides}
      layout={p.layout}
      align={p.align}
      minHeight={p.minHeight}
      autoplay={p.autoplay}
      loop={p.loop}
      muted={p.muted}
      showControls={p.showControls}
      playsInline={p.playsInline}
      overlayOpacity={p.overlayOpacity}
      overlayGradient={p.overlayGradient}
      autoplaySlides={p.autoplaySlides}
      autoplaySlideMs={p.autoplaySlideMs}
      showSlideDots={p.showSlideDots}
      showSlideArrows={p.showSlideArrows}
      locale={locale}
      overlayClass={overlayClass}
    />
  );
}
