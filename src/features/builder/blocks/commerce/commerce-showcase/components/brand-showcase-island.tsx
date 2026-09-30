"use client";

import type { Locale } from "@/i18n/routing";
import { getLocalizedField } from "@/lib/utils";
import type { BrandShowcaseNode } from "@/features/builder/blocks/commerce/commerce-showcase/lib/resolve-brand-profiles";
import { parseBrandShowcaseProps } from "@/features/builder/blocks/commerce/commerce-showcase/lib/parse-block-props";
import { ShowcaseSectionHeader } from "@/features/builder/blocks/commerce/commerce-showcase/components/showcase-section-header";
import { ShowcaseCardGrid } from "@/features/builder/blocks/commerce/commerce-showcase/components/showcase-card-grid";
import { ShowcaseSliderShell } from "@/features/builder/blocks/commerce/commerce-showcase/components/showcase-slider-shell";
import { BrandLogoTrack } from "@/features/builder/blocks/commerce/commerce-showcase/components/brand-logo-track";
import Link from "next/link";
import { ShowcaseLogoImage } from "@/features/builder/blocks/commerce/commerce-showcase/components/showcase-logo-image";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  locale: Locale;
  nodes: BrandShowcaseNode[];
  blockProps: Record<string, unknown>;
};

export function BrandShowcaseIsland({ locale, nodes, blockProps: raw }: Props) {
  const p = parseBrandShowcaseProps(raw);
  const [query, setQuery] = useState("");
  const title = getLocalizedField(p, "title", locale);
  const subtitle = getLocalizedField(p, "subtitle", locale);
  const badge = getLocalizedField(p, "badge", locale);

  const filtered = useMemo(() => {
    if (!p.searchEnabled || !query.trim()) return nodes;
    const q = query.trim().toLowerCase();
    return nodes.filter((n) => n.name.toLowerCase().includes(q));
  }, [nodes, query, p.searchEnabled]);

  const cards = filtered.map((n) => ({
    slug: n.slug,
    name: getLocalizedField(n as Record<string, unknown>, "name", locale) || n.name,
    href: n.href,
    imageUrl: n.bannerUrl || n.logoUrl,
    iconUrl: n.logoUrl,
    description: getLocalizedField(n as Record<string, unknown>, "description", locale),
    count: n.count,
    featured: n.featured,
  }));

  const isLogoCarousel = p.layout === "logoCarousel";
  const isCollectionSlider = p.layout === "collectionSlider";
  const featured = filtered.find((n) => n.featured) ?? filtered[0];

  const logoItems = cards.map((c) => ({
    id: c.slug,
    imageUrl: c.iconUrl,
    name: c.name,
    href: c.href,
  }));
  const featuredDescription = featured
    ? getLocalizedField(featured as Record<string, unknown>, "description", locale)
    : "";

  return (
    <div>
      <ShowcaseSectionHeader title={title} subtitle={subtitle} badge={badge} />
      <div className={title || subtitle ? "mt-6 space-y-4" : "space-y-4"}>
        {p.searchEnabled && p.layout === "directory" ? (
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search brands…"
            className="max-w-sm"
          />
        ) : null}

        {p.layout === "featuredBanner" && featured ? (
          <Link
            href={featured.href}
            prefetch={false}
            className="block overflow-hidden rounded-2xl border bg-gradient-to-r from-muted/80 to-card p-6 sm:p-8"
          >
            <div className="flex flex-wrap items-center gap-6">
              {featured.logoUrl ? (
                <div className="relative h-16 w-32">
                  <ShowcaseLogoImage
                    src={featured.logoUrl}
                    alt=""
                    fill
                    className={cn(p.grayscale && "grayscale")}
                  />
                </div>
              ) : null}
              <div>
                <p className="text-xl font-semibold">{featured.name}</p>
                {featuredDescription ? (
                  <p className="text-sm text-muted-foreground mt-1 max-w-xl">{featuredDescription}</p>
                ) : null}
                {p.showCounts && featured.count != null ? (
                  <p className="text-xs text-muted-foreground mt-2">{featured.count} products</p>
                ) : null}
              </div>
            </div>
          </Link>
        ) : null}

        {isLogoCarousel ? (
          <BrandLogoTrack
            items={logoItems}
            mode={p.logoCarouselMode}
            autoplay={p.autoplay}
            autoplayIntervalMs={p.autoplayIntervalMs}
            showArrows={p.showArrows}
            slidesPerView={p.slidesPerView}
            grayscale={p.grayscale}
            grayscaleHover={p.grayscaleHover}
            logoSize={p.logoSize}
            scrollSpeed={p.scrollSpeed}
            scrollDirection={p.scrollDirection}
            pauseOnHover={p.pauseOnHover}
            showEdgeFade={p.showEdgeFade}
            separator={p.separator}
            scrollSpeedCustom={p.scrollSpeedCustom}
          />
        ) : isCollectionSlider ? (
          <ShowcaseSliderShell
            slidesPerView={p.slidesPerView}
            showArrows={p.showArrows}
            items={cards.map((c) => ({
              key: c.slug,
              node: (
                <Link
                  href={c.href}
                  prefetch={false}
                  className="flex h-24 items-center justify-center rounded-xl border bg-card/50 p-4 transition-colors hover:border-primary/30"
                >
                  {c.iconUrl ? (
                    <div className="relative h-12 w-full">
                      <ShowcaseLogoImage
                        src={c.iconUrl}
                        alt={c.name}
                        fill
                        className={cn(p.grayscale && "grayscale opacity-80")}
                      />
                    </div>
                  ) : (
                    <span className="text-sm font-medium">{c.name}</span>
                  )}
                </Link>
              ),
            }))}
          />
        ) : p.layout === "featuredBanner" ? null : (
          <ShowcaseCardGrid
            items={cards}
            layout={p.layout === "brandCards" ? "cards" : p.layout === "directory" ? "list" : "grid"}
            columns={p.columns}
            showImages={p.layout !== "logoGrid"}
            showCounts={p.showCounts}
            showDescriptions={p.showDescriptions}
            grayscale={p.grayscale}
          />
        )}
      </div>
    </div>
  );
}
