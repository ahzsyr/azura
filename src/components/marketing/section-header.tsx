"use client";

import { cn } from "@/lib/utils";

export type SectionHeaderProps = {
  badge?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "start";
  dark?: boolean;
  containerClassName?: string;
  badgeClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
};

export function SectionHeader({
  badge,
  title,
  subtitle,
  align = "center",
  dark = false,
  containerClassName,
  badgeClassName,
  titleClassName,
  subtitleClassName,
}: SectionHeaderProps) {
  return (
    <div
      data-scroll-item
      data-reveal="slide-up"
      className={cn(
        "mb-12 md:mb-16",
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl",
        containerClassName
      )}
    >
      {badge && (
        <span
          className={cn(
            "az-hero-badge mb-4 text-xs font-medium uppercase tracking-wider",
            dark ? "text-accent" : "text-primary",
            badgeClassName
          )}
        >
          {badge}
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
      <div className={cn("gold-divider my-4", align === "center" && "mx-auto")} />
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
    </div>
  );
}
