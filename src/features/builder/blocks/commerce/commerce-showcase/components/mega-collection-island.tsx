"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/routing";
import { getLocalizedField } from "@/lib/utils";
import type { CategoryShowcaseNode } from "@/features/builder/blocks/commerce/commerce-showcase/lib/resolve-category-showcase-nodes";
import type { ProductListingRecord } from "@/features/products/listing/types";
import type { BrandShowcaseNode } from "@/features/builder/blocks/commerce/commerce-showcase/lib/resolve-brand-profiles";
import type { BlockNode } from "@/types/builder";
import type { DeviceBreakpoint } from "@/types/block-system";
import { resolveContentOverflowCssFlags } from "@/features/builder/styles/content-overflow-resolver";
import { parseMegaCollectionShowcaseProps } from "@/features/builder/blocks/commerce/commerce-showcase/lib/parse-block-props";
import { ShowcaseSectionHeader } from "@/features/builder/blocks/commerce/commerce-showcase/components/showcase-section-header";
import { ShowcaseProductPanel } from "@/features/builder/blocks/commerce/commerce-showcase/components/showcase-product-panel";
import { useShowcaseTabFetch } from "@/features/builder/blocks/commerce/commerce-showcase/hooks/use-showcase-tab-fetch";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  locale: Locale;
  navNodes: CategoryShowcaseNode[];
  initialRecords: ProductListingRecord[];
  initialTotal: number;
  initialNavKey: string;
  featuredBrand?: BrandShowcaseNode;
  blockProps: Record<string, unknown>;
  block?: BlockNode;
  previewDevice?: DeviceBreakpoint;
};

export function MegaCollectionIsland({
  locale,
  navNodes,
  initialRecords,
  initialTotal,
  initialNavKey,
  featuredBrand,
  blockProps: raw,
  block,
  previewDevice,
}: Props) {
  const p = parseMegaCollectionShowcaseProps(raw);
  const [activeKey, setActiveKey] = useState(initialNavKey);

  const isInitial = activeKey === initialNavKey;
  const fetchState = useShowcaseTabFetch({
    locale,
    taxonomy: "category",
    tabKey: activeKey,
    limit: p.centerLimit,
    sort: p.centerSortBy,
    enabled: p.syncNavToProducts && !isInitial,
    initialRecords,
    initialTotal,
  });

  const records = isInitial ? initialRecords : fetchState.records;
  const flags = block
    ? resolveContentOverflowCssFlags(block)
    : resolveContentOverflowCssFlags({ id: "mega-collection", type: "megaCollectionShowcase", props: raw });

  const title = getLocalizedField(p, "title", locale);
  const subtitle = getLocalizedField(p, "subtitle", locale);
  const promoTitle = getLocalizedField(p, "rightPromoTitle", locale);
  const promoCta = getLocalizedField(p, "rightPromoCta", locale);

  return (
    <div>
      <ShowcaseSectionHeader title={title} subtitle={subtitle} />
      <div className={cn("mt-6 grid gap-6", "lg:grid-cols-[minmax(0,220px)_1fr_minmax(0,260px)]")}>
        <nav className="space-y-1 max-lg:flex max-lg:flex-wrap max-lg:gap-2">
          {navNodes.map((node) => (
            <button
              key={node.slug}
              type="button"
              onClick={() => p.syncNavToProducts && setActiveKey(node.slug)}
              className={cn(
                "block w-full text-left rounded-lg px-3 py-2 text-sm transition-colors",
                activeKey === node.slug
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted/60 text-muted-foreground",
                "max-lg:inline-block max-lg:w-auto max-lg:border max-lg:rounded-full",
              )}
            >
              {p.leftShowIcons && node.iconUrl ? (
                <span className="inline-block w-4 h-4 mr-2 align-middle relative">
                  <Image src={node.iconUrl} alt="" fill className="object-contain" />
                </span>
              ) : null}
              {node.name}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          <ShowcaseProductPanel
            records={records}
            localePrefix={locale}
            layout={p.centerLayout}
            columns={p.centerColumns}
            flags={flags}
            previewDevice={previewDevice}
            loading={!isInitial && fetchState.loading}
          />
        </div>

        <aside className="space-y-4">
          {p.rightPromoImageUrl || promoTitle ? (
            <div className="overflow-hidden rounded-xl border bg-card">
              {p.rightPromoImageUrl ? (
                <div className="relative aspect-[4/3] bg-muted">
                  <Image src={p.rightPromoImageUrl} alt="" fill className="object-cover" />
                </div>
              ) : null}
              <div className="p-4">
                {promoTitle ? <p className="font-semibold">{promoTitle}</p> : null}
                {p.rightPromoHref && promoCta ? (
                  <Link href={p.rightPromoHref} className="mt-2 inline-block text-sm text-primary hover:underline">
                    {promoCta}
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}

          {featuredBrand ? (
            <Link
              href={featuredBrand.href}
              className="block rounded-xl border p-4 bg-muted/30 hover:border-primary/30 transition-colors"
            >
              {featuredBrand.logoUrl ? (
                <div className="relative h-10 w-24 mb-2">
                  <Image src={featuredBrand.logoUrl} alt="" fill className="object-contain object-left" />
                </div>
              ) : null}
              <p className="text-sm font-medium">{featuredBrand.name}</p>
              {featuredBrand.count != null ? (
                <p className="text-xs text-muted-foreground mt-1">{featuredBrand.count} products</p>
              ) : null}
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
