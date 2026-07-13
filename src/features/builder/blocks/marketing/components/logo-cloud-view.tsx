"use client";

import Image from "next/image";
import { SectionHeader } from "@/components/marketing/section";
import { AnimatedSection } from "@/components/motion/lazy-motion";
import { LogoCarousel, LogoMarquee } from "@/features/builder/blocks/marketing/components/logo-carousel";
import { resolveItemField } from "@/features/builder/blocks/marketing/lib/resolve-item-locale";
import type { LogoItem } from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { MarketingItemsOverflow } from "@/features/builder/components/marketing-items-overflow";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  subtitle?: string;
  displayMode?: "grid" | "carousel" | "marquee";
  columns?: 3 | 4 | 5 | 6;
  grayscale?: boolean;
  grayscaleHover?: boolean;
  autoplay?: boolean;
  autoplayIntervalMs?: number;
  logoSize?: "sm" | "md" | "lg";
  groupByCategory?: boolean;
  items: LogoItem[];
  locale: string;
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

const colClasses = {
  3: "grid-cols-3",
  4: "grid-cols-3 sm:grid-cols-4",
  5: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5",
  6: "grid-cols-3 sm:grid-cols-4 md:grid-cols-6",
};

const sizeClasses = {
  sm: "h-8 w-24",
  md: "h-12 w-32",
  lg: "h-16 w-40",
};

export function LogoCloudView({
  title,
  subtitle,
  displayMode = "grid",
  columns = 5,
  grayscale = true,
  grayscaleHover = true,
  autoplay = true,
  autoplayIntervalMs = 4000,
  logoSize = "md",
  groupByCategory = false,
  items,
  locale,
  block,
  overflow,
}: Props) {
  const carouselItems = items.map((item) => ({
    id: item.id,
    imageUrl: item.imageUrl,
    name: resolveItemField(item, "name", locale),
    href: item.href || undefined,
  }));

  if (groupByCategory) {
    const groups = new Map<string, LogoItem[]>();
    items.forEach((item) => {
      const cat = resolveItemField(item, "category", locale) || "General";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(item);
    });

    return (
      <AnimatedSection>
        {title && <SectionHeader title={title} subtitle={subtitle} />}
        <div className="space-y-10">
          {Array.from(groups.entries()).map(([category, groupItems]) => (
            <div key={category}>
              <h3 className="mb-4 text-center text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {category}
              </h3>
              <LogoCloudInner
                items={groupItems}
                locale={locale}
                displayMode={displayMode}
                columns={columns}
                grayscale={grayscale}
                grayscaleHover={grayscaleHover}
                autoplay={autoplay}
                autoplayIntervalMs={autoplayIntervalMs}
                logoSize={logoSize}
                block={block!}
                overflow={overflow!}
              />
            </div>
          ))}
        </div>
      </AnimatedSection>
    );
  }

  return (
    <AnimatedSection>
      {title && <SectionHeader title={title} subtitle={subtitle} />}
      <LogoCloudInner
        items={items}
        locale={locale}
        displayMode={displayMode}
        columns={columns}
        grayscale={grayscale}
        grayscaleHover={grayscaleHover}
        autoplay={autoplay}
        autoplayIntervalMs={autoplayIntervalMs}
        logoSize={logoSize}
        carouselItems={carouselItems}
        block={block}
        overflow={overflow}
      />
    </AnimatedSection>
  );
}

function LogoCloudInner({
  items,
  locale,
  displayMode,
  columns,
  grayscale,
  grayscaleHover,
  autoplay,
  autoplayIntervalMs,
  logoSize,
  carouselItems,
  block,
  overflow,
}: {
  items: LogoItem[];
  locale: string;
  displayMode: "grid" | "carousel" | "marquee";
  columns: 3 | 4 | 5 | 6;
  grayscale: boolean;
  grayscaleHover: boolean;
  autoplay: boolean;
  autoplayIntervalMs: number;
  logoSize: "sm" | "md" | "lg";
  carouselItems?: { id: string; imageUrl: string; name: string; href?: string }[];
  block?: BlockNode;
  overflow?: BlockOverflowContext;
}) {
  const mapped =
    carouselItems ??
    items.map((item) => ({
      id: item.id,
      imageUrl: item.imageUrl,
      name: resolveItemField(item, "name", locale),
      href: item.href || undefined,
    }));

  const renderLogoItem = (item: LogoItem) => {
    const name = resolveItemField(item, "name", locale);
    const inner = (
      <div
        className={cn(
          "relative mx-auto flex items-center justify-center",
          sizeClasses[logoSize],
          grayscale && "grayscale",
          grayscaleHover && "opacity-70 transition hover:grayscale-0 hover:opacity-100"
        )}
      >
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={name}
            fill
            className="object-contain"
            sizes="128px"
            loading="lazy"
          />
        ) : (
          <span className="text-xs text-muted-foreground">{name}</span>
        )}
      </div>
    );
    return item.href ? (
      <a href={item.href} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    ) : (
      inner
    );
  };

  if (block && overflow && displayMode !== "marquee") {
    return (
      <MarketingItemsOverflow
        block={block}
        overflowFlags={overflow.flags}
        previewDevice={overflow.previewDevice}
        items={items}
        columns={columns <= 4 ? (columns as 2 | 3 | 4) : 4}
        gridClassName={colClasses[columns]}
        autoplay={autoplay}
        autoplayIntervalMs={autoplayIntervalMs}
        getItemKey={(item: LogoItem) => item.id}
        renderItem={renderLogoItem}
      />
    );
  }

  if (displayMode === "carousel") {
    return (
      <LogoCarousel
        items={mapped}
        autoplay={autoplay}
        autoplayIntervalMs={autoplayIntervalMs}
        grayscale={grayscale}
        grayscaleHover={grayscaleHover}
        logoSize={logoSize}
      />
    );
  }

  if (displayMode === "marquee") {
    return (
      <LogoMarquee
        items={mapped}
        grayscale={grayscale}
        grayscaleHover={grayscaleHover}
        logoSize={logoSize}
      />
    );
  }

  return (
    <div className={cn("grid items-center gap-8", colClasses[columns])}>
      {items.map((item) => {
        const name = resolveItemField(item, "name", locale);
        const inner = (
          <div
            className={cn(
              "relative mx-auto flex items-center justify-center",
              sizeClasses[logoSize],
              grayscale && "grayscale",
              grayscaleHover && "opacity-70 transition hover:grayscale-0 hover:opacity-100"
            )}
          >
            {item.imageUrl ? (
              <Image src={item.imageUrl} alt={name} fill className="object-contain" sizes="128px" />
            ) : (
              <span className="text-xs text-muted-foreground">{name}</span>
            )}
          </div>
        );
        return item.href ? (
          <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer">
            {inner}
          </a>
        ) : (
          <div key={item.id}>{inner}</div>
        );
      })}
    </div>
  );
}
