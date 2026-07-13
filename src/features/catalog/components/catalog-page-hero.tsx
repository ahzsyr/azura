"use client";

import type { CSSProperties } from "react";
import {
  catalogPageHeroCssVars,
  type ResolvedCatalogPageHero,
} from "@/features/catalog/lib/catalog-layout";
import { CatalogHeroExpandableDescription } from "@/features/catalog/components/catalog-hero-expandable-description";
import { siteHeroHeadingAttrs } from "@/features/theme/hero-heading-attrs";
import { useTextEffectRescan } from "@/features/theme/use-text-effect-rescan";

export type CatalogHeroBrandDetail = {
  logoUrl?: string;
  description?: string;
  productCount: number;
  collectionCount: number;
};

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  dir?: "ltr" | "rtl";
  hero: ResolvedCatalogPageHero;
  headingTextEffect?: string | null;
  preset?: string;
  brandDetail?: CatalogHeroBrandDetail;
};

export function CatalogPageHero({
  title,
  subtitle,
  eyebrow,
  dir = "ltr",
  hero,
  headingTextEffect,
  preset,
  brandDetail,
}: Props) {
  const heroVars = catalogPageHeroCssVars(hero) as CSSProperties;
  const headingAttrs = siteHeroHeadingAttrs(headingTextEffect);
  useTextEffectRescan(headingTextEffect);
  const styleClass = `catalog-hero--${hero.style}`;
  const bannerStyle =
    hero.bannerImage && (hero.style === "banner" || hero.style === "split")
      ? { backgroundImage: `url(${hero.bannerImage})` }
      : undefined;

  const description = brandDetail?.description?.trim() ?? "";
  const logoUrl = brandDetail?.logoUrl?.trim() ?? "";
  const productCount = brandDetail?.productCount ?? 0;
  const collectionCount = brandDetail?.collectionCount ?? 0;

  return (
    <header
      className={`catalog-hero ${styleClass}${brandDetail ? " catalog-hero--brand-detail" : ""}`}
      dir={dir}
      data-preset={preset || undefined}
      style={heroVars}
    >
      {bannerStyle ? (
        <div className="catalog-hero__banner" style={bannerStyle} aria-hidden />
      ) : null}
      <div className="catalog-hero__inner">
        {brandDetail ? (
          <>
            {logoUrl ? (
              <div className="catalog-hero__logo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="" width={64} height={64} />
              </div>
            ) : null}
            <div className="catalog-hero__copy">
              {hero.showEyebrow && eyebrow ? (
                <p className="catalog-hero__eyebrow">{eyebrow}</p>
              ) : null}
              <h1 className="catalog-hero__title" data-hero-title {...headingAttrs}>
                {title}
              </h1>
              {description ? <CatalogHeroExpandableDescription text={description} /> : null}
              <p className="catalog-hero__stats">
                <span>
                  {productCount} {productCount === 1 ? "product" : "products"}
                </span>
                {collectionCount > 0 ? (
                  <>
                    <span className="catalog-hero__stats-dot">·</span>
                    <span>
                      {collectionCount}{" "}
                      {collectionCount === 1 ? "collection" : "collections"}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
          </>
        ) : (
          <div className="catalog-hero__copy">
            {hero.showEyebrow && eyebrow ? <p className="catalog-hero__eyebrow">{eyebrow}</p> : null}
            <h1 className="catalog-hero__title" data-hero-title {...headingAttrs}>
              {title}
            </h1>
            {subtitle ? <p className="catalog-hero__subtitle">{subtitle}</p> : null}
          </div>
        )}
      </div>
      {hero.showGlow ? <div className="catalog-hero__glow" aria-hidden /> : null}
    </header>
  );
}
