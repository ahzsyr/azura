"use client";

import type { Locale } from "@/i18n/routing";
import { getLocalizedField } from "@/lib/utils";
import type { CategoryShowcaseNode } from "@/features/builder/blocks/commerce/commerce-showcase/lib/resolve-category-showcase-nodes";
import { parseCategoryShowcaseProps } from "@/features/builder/blocks/commerce/commerce-showcase/lib/parse-block-props";
import { ShowcaseSectionHeader } from "@/features/builder/blocks/commerce/commerce-showcase/components/showcase-section-header";
import { ShowcaseCardGrid } from "@/features/builder/blocks/commerce/commerce-showcase/components/showcase-card-grid";
import { ShowcaseSliderShell } from "@/features/builder/blocks/commerce/commerce-showcase/components/showcase-slider-shell";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  locale: Locale;
  nodes: CategoryShowcaseNode[];
  blockProps: Record<string, unknown>;
};

function nodeToCard(node: CategoryShowcaseNode, locale: Locale) {
  return {
    slug: node.slug,
    name: node.name,
    href: node.href,
    imageUrl: node.imageUrl,
    iconUrl: node.iconUrl,
    description: getLocalizedField(node as Record<string, unknown>, "description", locale),
    count: node.count,
    featured: false,
  };
}

function NestedTree({ nodes, depth = 0 }: { nodes: CategoryShowcaseNode[]; depth?: number }) {
  if (nodes.length === 0) return null;
  return (
    <ul className={cn(depth > 0 && "ml-4 border-l pl-3")}>
      {nodes.map((node) => (
        <li key={node.slug} className="py-1">
          <Link href={node.href} prefetch={false} className="text-sm font-medium hover:text-primary">
            {node.name}
            {node.count != null ? (
              <span className="ml-1 text-xs text-muted-foreground">({node.count})</span>
            ) : null}
          </Link>
          {node.children && node.children.length > 0 ? (
            <NestedTree nodes={node.children} depth={depth + 1} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function CategoryShowcaseIsland({ locale, nodes, blockProps: raw }: Props) {
  const p = parseCategoryShowcaseProps(raw);
  const title = getLocalizedField(p, "title", locale);
  const subtitle = getLocalizedField(p, "subtitle", locale);
  const badge = getLocalizedField(p, "badge", locale);

  const cards = nodes.map((n) => nodeToCard(n, locale));
  const isCarousel = p.layout === "carousel" || p.layout === "slider";

  return (
    <div>
      <ShowcaseSectionHeader title={title} subtitle={subtitle} badge={badge} />
      <div className={title || subtitle ? "mt-6" : undefined}>
        {p.layout === "nestedTree" ? (
          <NestedTree nodes={nodes} />
        ) : isCarousel ? (
          <ShowcaseSliderShell
            slidesPerView={p.slidesPerView}
            showArrows={p.showArrows}
            items={cards.map((c) => ({
              key: c.slug,
              node: (
                <Link
                  href={c.href}
                  prefetch={false}
                  className="block overflow-hidden rounded-xl border border-border/60 bg-card/50 transition-colors hover:border-primary/30"
                >
                  {p.showImages && c.imageUrl ? (
                    <div className="relative aspect-[16/10] bg-muted">
                      <Image src={c.imageUrl} alt="" fill className="object-cover" sizes="200px" />
                    </div>
                  ) : null}
                  <div className="p-3">
                    <p className="font-medium text-sm">{c.name}</p>
                    {p.showCounts && c.count != null ? (
                      <p className="text-xs text-muted-foreground">{c.count} items</p>
                    ) : null}
                  </div>
                </Link>
              ),
            }))}
          />
        ) : (
          <ShowcaseCardGrid
            items={cards}
            layout={
              p.layout === "megaTiles"
                ? "megaTiles"
                : p.layout === "banner"
                  ? "banner"
                  : p.layout === "icons"
                    ? "icons"
                    : p.layout === "masonry"
                      ? "masonry"
                      : p.layout === "list"
                        ? "list"
                        : p.layout === "cards"
                          ? "cards"
                          : "grid"
            }
            columns={p.columns}
            showImages={p.showImages}
            showCounts={p.showCounts}
            showDescriptions={p.showDescriptions}
          />
        )}
      </div>
    </div>
  );
}
