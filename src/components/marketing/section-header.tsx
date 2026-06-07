"use client";

import { cn } from "@/lib/utils";
import { useVisualExperience } from "@/components/theme/visual-experience-context";
import { siteHeroHeadingAttrs } from "@/features/theme/hero-heading-attrs";

export type SectionHeaderProps = {
  badge?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "start";
  dark?: boolean;
  /** Override site-wide text effect (defaults to VisualExperienceProvider). */
  siteTextEffect?: string | null;
};

export function SectionHeader({
  badge,
  title,
  subtitle,
  align = "center",
  dark = false,
  siteTextEffect: siteTextEffectProp,
}: SectionHeaderProps) {
  const experience = useVisualExperience();
  const textEffect = siteTextEffectProp ?? experience?.resolved.textEffect ?? null;
  const headingAttrs = siteHeroHeadingAttrs(textEffect);

  return (
    <div
      className={cn(
        "mb-12 md:mb-16",
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"
      )}
    >
      {badge && (
        <span
          className={cn(
            "az-hero-badge mb-4 text-xs font-medium uppercase tracking-wider",
            dark ? "text-accent" : "text-primary"
          )}
        >
          {badge}
        </span>
      )}
      <h2
        className={cn(
          "font-heading text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl",
          dark ? "text-background" : "text-foreground"
        )}
        data-text-effect-target="heading"
        {...headingAttrs}
      >
        {title}
      </h2>
      <div className={cn("gold-divider my-4", align === "center" && "mx-auto")} />
      {subtitle && (
        <p
          className={cn(
            "text-base leading-relaxed md:text-lg",
            dark ? "text-background/80" : "text-foreground/70"
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
