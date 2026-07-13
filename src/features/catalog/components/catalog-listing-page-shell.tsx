"use client";

import type { ReactNode } from "react";
import {
  CatalogPageHero,
  type CatalogHeroBrandDetail,
} from "@/features/catalog/components/catalog-page-hero";
import type { ResolvedCatalogPageHero } from "@/features/catalog/lib/catalog-layout";
import { catalogHeroSupportsHeaderOverlay } from "@/features/builder/header-overlay";

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  dir?: "ltr" | "rtl";
  hero: ResolvedCatalogPageHero;
  headingTextEffect?: string | null;
  preset?: string;
  brandDetail?: CatalogHeroBrandDetail;
  blocks?: ReactNode;
  children: ReactNode;
};

export function CatalogListingPageShell({
  title,
  subtitle,
  eyebrow,
  dir,
  hero,
  headingTextEffect,
  preset,
  brandDetail,
  blocks,
  children,
}: Props) {
  const supportsOverlay = catalogHeroSupportsHeaderOverlay(hero.style);

  return (
    <div
      className="catalog-page"
      dir={dir}
      {...(supportsOverlay ? { "data-header-overlay-underlay": "true" } : {})}
    >
      {blocks}
      <CatalogPageHero
        title={title}
        subtitle={subtitle}
        eyebrow={eyebrow}
        dir={dir}
        hero={hero}
        headingTextEffect={headingTextEffect}
        preset={preset}
        brandDetail={brandDetail}
      />
      {children}
    </div>
  );
}
