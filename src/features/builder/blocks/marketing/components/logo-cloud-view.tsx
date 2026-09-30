"use client";

import { SectionHeader } from "@/components/marketing/section";
import { AnimatedSection } from "@/components/motion/lazy-motion";
import { LogoCarousel, LogoMarquee } from "@/features/builder/blocks/marketing/components/logo-carousel";
import { LogoCloudImage } from "@/features/builder/blocks/marketing/components/logo-cloud-image";
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
  showNames?: boolean;
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

function LogoNameLabel({ name }: { name: string }) {
  if (!name.trim()) return null;
  return (
    <span className="mt-2 block max-w-full truncate text-center text-xs font-medium text-muted-foreground">
      {name}
    </span>
  );
}

function LogoCell({
  name,
  imageUrl,
  href,
  logoSize,
  grayscale,
  grayscaleHover,
  showNames,
}: {
  name: string;
  imageUrl: string;
  href?: string;
  logoSize: "sm" | "md" | "lg";
  grayscale: boolean;
  grayscaleHover: boolean;
  showNames: boolean;
}) {
  const image = (
    <div
      className={cn(
        "relative mx-auto flex items-center justify-center",
        sizeClasses[logoSize],
        grayscale && "grayscale",
        grayscaleHover && "opacity-70 transition hover:grayscale-0 hover:opacity-100"
      )}
    >
      {imageUrl ? (
        <LogoCloudImage src={imageUrl} alt={name} sizes="128px" loading="lazy" />
      ) : (
        <span className="text-xs text-muted-foreground">{name || "Logo"}</span>
      )}
    </div>
  );

  const content = (
    <div className="flex flex-col items-center">
      {image}
      {showNames ? <LogoNameLabel name={name} /> : null}
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }
  return content;
}

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
  showNames = false,
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
                showNames={showNames}
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
        showNames={showNames}
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
  showNames,
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
  showNames: boolean;
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

  const renderLogoItem = (item: LogoItem) => (
    <LogoCell
      name={resolveItemField(item, "name", locale)}
      imageUrl={item.imageUrl}
      href={item.href || undefined}
      logoSize={logoSize}
      grayscale={grayscale}
      grayscaleHover={grayscaleHover}
      showNames={showNames}
    />
  );

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
        showNames={showNames}
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
        showNames={showNames}
      />
    );
  }

  return (
    <div className={cn("grid items-start gap-8", colClasses[columns])}>
      {items.map((item) => (
        <div key={item.id}>
          <LogoCell
            name={resolveItemField(item, "name", locale)}
            imageUrl={item.imageUrl}
            href={item.href || undefined}
            logoSize={logoSize}
            grayscale={grayscale}
            grayscaleHover={grayscaleHover}
            showNames={showNames}
          />
        </div>
      ))}
    </div>
  );
}
