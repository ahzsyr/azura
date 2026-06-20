import Image from "next/image";
import { HeroAtmosphere } from "@/components/marketing/hero-atmosphere";
import { BlockBackgroundLayer } from "@/features/marketing-blocks/components/block-background-layer";
import { clampOverlayOpacity } from "@/features/marketing-blocks/lib/background-scrim";
import { BlockCtaButtons } from "@/features/marketing-blocks/components/block-cta-buttons";
import { cn } from "@/lib/utils";
import { presetHeroGradientClass } from "@/lib/theme/preset-surface-classes";
import { shouldShowHeroOverlay } from "@/features/marketing-blocks/lib/hero-pro-overlay";
import {
  heroEntranceClass,
  isHeroEntranceEffect,
  type HeroAnimationsConfig,
} from "@/features/marketing-blocks/lib/hero-animations";
import { HeroMotionClient } from "@/features/marketing-blocks/components/hero-motion-client";

type Props = {
  title: string;
  subtitle?: string;
  badge?: string;
  imageUrl?: string;
  foregroundImageUrl?: string;
  videoUrl?: string;
  backgroundType?: string;
  layout?: string;
  align?: string;
  minHeight?: string;
  overlayOpacity?: number;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string; variant?: "outline" | "ghost" | "gold" };
  headingEffect?: string | null;
  heroAnimations?: HeroAnimationsConfig;
  imagePosition?: string;
  overlayClass?: string;
  lazyLoad?: boolean;
  useTransparentHero?: boolean;
  /** When true, defer background to block Look & Feel section background */
  useBlockVisualBg?: boolean;
};

export function HeroProView({
  title,
  subtitle,
  badge,
  imageUrl,
  foregroundImageUrl,
  videoUrl,
  backgroundType = "image",
  layout = "centered",
  align = "center",
  minHeight = "70vh",
  overlayOpacity = 60,
  primaryCta,
  secondaryCta,
  headingEffect,
  heroAnimations,
  imagePosition = "cover",
  overlayClass,
  lazyLoad,
  useTransparentHero,
  useBlockVisualBg = false,
}: Props) {
  const hasHeroImage = Boolean(imageUrl);
  const isSplit = layout === "splitImageLeft" || layout === "splitImageRight";
  const hasFilledBackground =
    !useBlockVisualBg &&
    (hasHeroImage ||
      backgroundType === "video" ||
      backgroundType === "gradient" ||
      backgroundType === "image");
  const isLightHero = useTransparentHero || (!hasFilledBackground && backgroundType !== "solid");
  const showHeroOverlay = shouldShowHeroOverlay({
    useTransparentHero,
    useBlockVisualBg,
    backgroundType,
    imageUrl,
  });
  const alignClass =
    align === "left" ? "text-left items-start" : align === "right" ? "text-right items-end" : "text-center items-center";
  const scrimOpacity = clampOverlayOpacity(overlayOpacity);
  const entranceHeading = heroAnimations?.headingEffect;
  const hasBlockTypewriterHeading = entranceHeading === "typewriter";
  const siteTextEffect =
    !isLightHero && !hasBlockTypewriterHeading && headingEffect && !isHeroEntranceEffect(headingEffect)
      ? headingEffect
      : null;
  const hasParallaxBg =
    Boolean(imageUrl) &&
    backgroundType === "image" &&
    imagePosition === "parallax" &&
    Boolean(heroAnimations?.parallaxSpeed);

  const content = (
    <>
      {badge && (
        <span
          className={cn(
            "az-hero-badge mb-6 text-xs font-medium uppercase tracking-wider text-accent",
            heroEntranceClass(heroAnimations?.badgeEffect, "badge"),
          )}
        >
          {badge}
        </span>
      )}
      <h1
        className={cn(
          "font-heading font-bold leading-tight",
          isSplit ? "text-3xl md:text-4xl lg:text-5xl max-w-xl" : "text-4xl md:text-5xl lg:text-6xl max-w-3xl",
          heroEntranceClass(entranceHeading, "heading"),
        )}
        data-hero-title
        data-text-effect-target="heading"
        {...(isLightHero || hasBlockTypewriterHeading ? { "data-text-effect-off": "true" } : {})}
        {...(!isLightHero && siteTextEffect ? { "data-text-effect": siteTextEffect } : {})}
      >
        {title}
      </h1>
      {subtitle && (
        <>
          <div className="gold-divider my-6" />
          <p
            className={cn(
              "max-w-xl text-lg",
              hasFilledBackground && !useTransparentHero ? "text-white/85" : "text-muted-foreground",
              heroEntranceClass(heroAnimations?.subheadingEffect, "subheading"),
            )}
          >
            {subtitle}
          </p>
        </>
      )}
      {(primaryCta?.label || secondaryCta?.label) && (
        <BlockCtaButtons
          primary={primaryCta ?? { label: "", href: "" }}
          secondary={secondaryCta}
          className={cn("mt-10", align === "center" && "justify-center", align === "right" && "justify-end")}
          dark={hasFilledBackground && !useTransparentHero}
        />
      )}
    </>
  );

  if (isSplit) {
    return (
      <section
        data-block-type="hero"
        className={cn("relative overflow-hidden", overlayClass)}
        style={{ minHeight }}
      >
        <HeroMotionClient
          animations={heroAnimations}
          imagePosition={imagePosition}
          hasParallaxBg={hasParallaxBg}
        />
        <HeroAtmosphere showGlow />
        <div className="container-premium relative z-10 grid min-h-[inherit] items-center gap-8 py-20 lg:grid-cols-2">
          {layout === "splitImageRight" && (
            <div className={cn("flex flex-col", alignClass)}>{content}</div>
          )}
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
            {(foregroundImageUrl || imageUrl) && (
              <>
                <Image
                  src={foregroundImageUrl || imageUrl!}
                  alt=""
                  fill
                  className="object-cover"
                  priority={!lazyLoad}
                  sizes="(max-width:768px) 100vw, 600px"
                />
                {scrimOpacity > 0 && (
                  <div
                    className="absolute inset-0 bg-black"
                    style={{ opacity: scrimOpacity / 100 }}
                    aria-hidden
                  />
                )}
              </>
            )}
          </div>
          {layout === "splitImageLeft" && (
            <div className={cn("flex flex-col", alignClass)}>{content}</div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      data-block-type="hero"
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        useTransparentHero && presetHeroGradientClass(),
        useTransparentHero && "hero-overlay--transparent",
        hasFilledBackground && !useTransparentHero ? "text-white" : "text-foreground",
        overlayClass
      )}
      style={{
        minHeight,
        ...(imagePosition === "parallax" && hasHeroImage
          ? { backgroundPosition: "fixed" as const }
          : {}),
      }}
    >
      <HeroMotionClient
        animations={heroAnimations}
        imagePosition={imagePosition}
        hasParallaxBg={hasParallaxBg}
      />
      <BlockBackgroundLayer
        backgroundType={backgroundType === "transparent" ? "transparent" : backgroundType}
        imageUrl={imageUrl}
        videoUrl={videoUrl}
        overlayOpacity={overlayOpacity}
        imagePosition={imagePosition}
        parallax={hasParallaxBg}
        priority={!lazyLoad}
        className="absolute inset-0"
      />
      <HeroAtmosphere showGlow={!useTransparentHero && !useBlockVisualBg && (hasHeroImage || showHeroOverlay)} />
      <div className={cn("container-premium relative z-10 flex flex-col py-20", alignClass, "justify-center")}>
        {content}
      </div>
    </section>
  );
}
