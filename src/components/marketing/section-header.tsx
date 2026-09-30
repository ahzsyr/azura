"use client";

import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

export type SectionHeaderAlign = "center" | "start" | "left" | "right";

export type SectionHeaderProps = {
  badge?: string;
  /** Alias for badge — eyebrow/label above the title. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: SectionHeaderAlign;
  dark?: boolean;
  showAccentLine?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
  headerIcon?: React.ReactNode;
  headerImageUrl?: string;
  containerClassName?: string;
  badgeClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
};

function resolveAlign(align: SectionHeaderAlign): "center" | "start" | "end" {
  if (align === "center") return "center";
  if (align === "right") return "end";
  return "start";
}

export function SectionHeader({
  badge,
  eyebrow,
  title,
  subtitle,
  align = "center",
  dark = false,
  showAccentLine = true,
  ctaLabel,
  ctaHref,
  headerIcon,
  headerImageUrl,
  containerClassName,
  badgeClassName,
  titleClassName,
  subtitleClassName,
}: SectionHeaderProps) {
  const resolvedAlign = resolveAlign(align);
  const label = eyebrow || badge;

  return (
    <div
      data-scroll-item
      data-reveal="slide-up"
      className={cn(
        "mb-12 md:mb-16",
        resolvedAlign === "center" && "mx-auto max-w-2xl text-center",
        resolvedAlign === "start" && "max-w-2xl text-start",
        resolvedAlign === "end" && "ms-auto max-w-2xl text-end",
        containerClassName
      )}
    >
      {headerImageUrl ? (
        <div className={cn("mb-4", resolvedAlign === "center" && "mx-auto", "relative h-12 w-12 overflow-hidden rounded-lg")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={headerImageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : headerIcon ? (
        <div
          className={cn(
            "mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary",
            resolvedAlign === "center" && "mx-auto"
          )}
        >
          {headerIcon}
        </div>
      ) : null}
      {label && (
        <span
          className={cn(
            "az-hero-badge mb-4 text-xs font-medium uppercase tracking-wider",
            dark ? "text-accent" : "text-primary",
            badgeClassName
          )}
        >
          {label}
        </span>
      )}
      <h2
        className={cn(
          "font-heading text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl",
          dark ? "text-background" : "text-foreground",
          titleClassName
        )}
      >
        {title}
      </h2>
      {showAccentLine ? (
        <div
          className={cn(
            "gold-divider my-4",
            resolvedAlign === "center" && "mx-auto",
            resolvedAlign === "end" && "ms-auto"
          )}
        />
      ) : null}
      {subtitle && (
        <p
          className={cn(
            "text-base leading-relaxed md:text-lg",
            dark ? "text-background/80" : "text-foreground/70",
            subtitleClassName
          )}
        >
          {subtitle}
        </p>
      )}
      {ctaLabel && ctaHref ? (
        <div className={cn("mt-6", resolvedAlign === "center" && "flex justify-center", resolvedAlign === "end" && "flex justify-end")}>
          <Link
            href={ctaHref}
            className={cn(
              "inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            )}
          >
            {ctaLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
