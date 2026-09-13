import { BlockBackgroundLayer } from "@/features/builder/blocks/marketing/components/block-background-layer";
import { BlockCtaButtons } from "@/features/builder/blocks/marketing/components/block-cta-buttons";
import { CountdownTimer } from "@/features/builder/blocks/marketing/components/countdown-timer";
import { cn } from "@/lib/utils";
import "./cta-banner.css";

type Props = {
  title: string;
  subtitle?: string;
  promoBadge?: string;
  promoText?: string;
  layout?: string;
  size?: string;
  backgroundType?: string;
  backgroundImageUrl?: string;
  backgroundVideoUrl?: string;
  backgroundColor?: string;
  primaryButton?: { label: string; href: string };
  secondaryButton?: { label: string; href: string };
  countdownEnabled?: boolean;
  countdownTarget?: string;
  countdownLabel?: string;
};

export function CtaBannerView({
  title,
  subtitle,
  promoBadge,
  promoText,
  layout = "centered",
  size = "default",
  backgroundType = "gradient",
  backgroundImageUrl,
  backgroundVideoUrl,
  backgroundColor,
  primaryButton,
  secondaryButton,
  countdownEnabled,
  countdownTarget,
  countdownLabel,
}: Props) {
  const padding =
    size === "compact"
      ? "px-6 py-8 sm:px-8"
      : size === "large"
        ? "px-8 py-14 sm:px-12 md:px-16 md:py-20"
        : "px-7 py-10 sm:px-10 md:px-12 md:py-14";

  const isTransparent = backgroundType === "transparent" || backgroundType === "none";
  const useBrandSurface = backgroundType === "gradient";
  const isFilled =
    !isTransparent &&
    (backgroundType === "gradient" ||
      backgroundType === "image" ||
      backgroundType === "video" ||
      (backgroundType === "solid" && Boolean(backgroundColor)));

  const isCentered = layout === "centered";
  const isSplit = layout === "split";
  const isInline = layout === "inline";

  return (
    <BlockBackgroundLayer
      backgroundType={useBrandSurface ? "transparent" : backgroundType}
      imageUrl={backgroundImageUrl}
      videoUrl={backgroundVideoUrl}
      backgroundColor={backgroundColor}
      overlayOpacity={55}
      className={cn(
        "az-cta-banner",
        useBrandSurface && "az-cta-banner--brand",
        isFilled && "az-cta-banner--filled",
        !isFilled && !isTransparent && "az-cta-banner--light",
        padding,
      )}
    >
      <div
        className={cn(
          isSplit && "grid gap-8 md:grid-cols-2 md:items-center md:text-start",
          isInline && "flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10 md:text-start",
          isCentered && "flex flex-col items-center text-center",
        )}
      >
        <div
          className={cn(
            isCentered && "mx-auto flex w-full max-w-[20.5rem] flex-col items-center sm:max-w-md",
            isInline && "min-w-0 flex-1",
            isSplit && "md:max-w-xl",
            size === "large" && isCentered && "sm:max-w-lg",
          )}
        >
          {promoBadge ? <span className="az-cta-banner__badge">{promoBadge}</span> : null}
          {title ? (
            <h2
              className={cn(
                "az-cta-banner__title font-heading whitespace-pre-line text-balance",
                size === "large"
                  ? "text-3xl sm:text-4xl md:text-[2.75rem]"
                  : size === "compact"
                    ? "text-2xl sm:text-[1.75rem]"
                    : "text-[1.85rem] sm:text-3xl md:text-4xl",
              )}
            >
              {title}
            </h2>
          ) : null}
          {subtitle ? (
            <p
              className={cn(
                "az-cta-banner__body whitespace-pre-line",
                !isCentered && "max-w-xl",
                isCentered && "mx-auto",
              )}
            >
              {subtitle}
            </p>
          ) : null}
          {promoText ? <p className="az-cta-banner__promo">{promoText}</p> : null}
        </div>
        <div
          className={cn(
            "flex flex-col gap-5",
            isCentered && "mt-9 items-center md:mt-10",
            isSplit && "md:items-end",
            isInline && "shrink-0 items-start md:items-center",
          )}
        >
          {countdownEnabled && countdownTarget ? (
            <CountdownTimer target={countdownTarget} label={countdownLabel} />
          ) : null}
          <BlockCtaButtons
            primary={primaryButton ?? { label: "", href: "" }}
            secondary={secondaryButton}
            className={cn(isCentered && "justify-center")}
            primaryClassName="az-cta-banner__btn"
            dark={isFilled}
          />
        </div>
      </div>
    </BlockBackgroundLayer>
  );
}
