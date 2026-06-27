"use client";

import type { ReactNode } from "react";
import { CatalogPageHero } from "@/features/catalog/components/catalog-page-hero";
import type { ResolvedCatalogPageHero } from "@/features/catalog/lib/catalog-layout";

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  dir?: "ltr" | "rtl";
  hero: ResolvedCatalogPageHero;
  headingTextEffect?: string | null;
  preset?: string;
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
  blocks,
  children,
}: Props) {
  return (
    <div className="catalog-page" dir={dir}>
      {blocks}
      <CatalogPageHero
        title={title}
        subtitle={subtitle}
        eyebrow={eyebrow}
        dir={dir}
        hero={hero}
        headingTextEffect={headingTextEffect}
        preset={preset}
      />
      {children}
    </div>
  );
}
