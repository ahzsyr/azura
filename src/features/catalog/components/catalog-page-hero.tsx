"use client";

import type { CSSProperties } from "react";
import {
  catalogPageHeroCssVars,
  type ResolvedCatalogPageHero,
} from "@/features/catalog/lib/catalog-layout";
import { siteHeroHeadingAttrs } from "@/features/theme/hero-heading-attrs";

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  dir?: "ltr" | "rtl";
  hero: ResolvedCatalogPageHero;
  headingTextEffect?: string | null;
  preset?: string;
};

export function CatalogPageHero({
  title,
  subtitle,
  eyebrow,
  dir = "ltr",
  hero,
  headingTextEffect,
  preset,
}: Props) {
  const heroVars = catalogPageHeroCssVars(hero) as CSSProperties;
  const headingAttrs = siteHeroHeadingAttrs(headingTextEffect);
  const styleClass = `catalog-hero--${hero.style}`;
  const bannerStyle =
    hero.bannerImage && (hero.style === "banner" || hero.style === "split")
      ? { backgroundImage: `url(${hero.bannerImage})` }
      : undefined;

  return (
    <header
      className={`catalog-hero ${styleClass}`}
      dir={dir}
      data-preset={preset || undefined}
      style={heroVars}
    >
      {bannerStyle ? (
        <div className="catalog-hero__banner" style={bannerStyle} aria-hidden />
      ) : null}
      <div className="catalog-hero__inner">
        <div className="catalog-hero__copy">
          {hero.showEyebrow && eyebrow ? <p className="catalog-hero__eyebrow">{eyebrow}</p> : null}
          <h1 className="catalog-hero__title" data-hero-title {...headingAttrs}>
            {title}
          </h1>
          {subtitle ? <p className="catalog-hero__subtitle">{subtitle}</p> : null}
        </div>
      </div>
      {hero.showGlow ? <div className="catalog-hero__glow" aria-hidden /> : null}
    </header>
  );
}
