import { BlockBackgroundLayer } from "@/features/marketing-blocks/components/block-background-layer";
import { BlockCtaButtons } from "@/features/marketing-blocks/components/block-cta-buttons";
import { CountdownTimer } from "@/features/marketing-blocks/components/countdown-timer";
import { cn } from "@/lib/utils";

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
    size === "compact" ? "px-6 py-10" : size === "large" ? "px-10 py-20 md:px-20" : "px-8 py-16 md:px-16";

  const isTransparent = backgroundType === "transparent" || backgroundType === "none";
  const isDark =
    !isTransparent &&
    (backgroundType === "gradient" ||
      backgroundType === "image" ||
      backgroundType === "video" ||
      Boolean(backgroundColor));

  return (
    <BlockBackgroundLayer
      backgroundType={backgroundType}
      imageUrl={backgroundImageUrl}
      videoUrl={backgroundVideoUrl}
      backgroundColor={backgroundColor}
      overlayOpacity={50}
      className={cn("rounded-2xl", padding, isDark && "text-white")}
    >
      <div
        className={cn(
          layout === "split" && "grid gap-8 md:grid-cols-2 md:items-center",
          layout === "inline" && "flex flex-col gap-6 md:flex-row md:items-center md:justify-between",
          layout === "centered" && "text-center"
        )}
      >
        <div className={cn(layout === "centered" && "mx-auto max-w-2xl")}>
          {promoBadge && (
            <span className="mb-3 inline-block rounded-full bg-accent/20 px-3 py-1 text-xs font-medium uppercase tracking-wide text-accent">
              {promoBadge}
            </span>
          )}
          <h2 className={cn("font-heading font-semibold", size === "large" ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl")}>
            {title}
          </h2>
          {subtitle && (
            <p className={cn("mt-4 max-w-xl", isDark ? "text-white/85" : "text-muted-foreground", layout === "centered" && "mx-auto")}>
              {subtitle}
            </p>
          )}
          {promoText && <p className="mt-2 text-sm opacity-80">{promoText}</p>}
        </div>
        <div
          className={cn(
            "flex flex-col gap-4",
            layout === "centered" && "mt-8 items-center",
            layout === "inline" && "shrink-0 items-start md:items-center"
          )}
        >
          {countdownEnabled && countdownTarget && (
            <CountdownTimer target={countdownTarget} label={countdownLabel} />
          )}
          <BlockCtaButtons
            primary={primaryButton ?? { label: "", href: "" }}
            secondary={secondaryButton}
            className={cn(layout === "centered" && "justify-center")}
            dark={isDark}
          />
        </div>
      </div>
    </BlockBackgroundLayer>
  );
}
