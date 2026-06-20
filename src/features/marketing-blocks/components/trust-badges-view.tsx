"use client";

import Image from "next/image";
import { SectionHeader } from "@/components/marketing/section";
import { AnimatedSection } from "@/components/motion/lazy-motion";
import { resolveMarketingIcon } from "@/features/marketing-blocks/lib/icon-map";
import { resolveItemField } from "@/features/marketing-blocks/lib/resolve-item-locale";
import type { TrustBadgeItem } from "@/features/marketing-blocks/schemas/marketing-blocks";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { MarketingItemsOverflow } from "@/features/builder/components/marketing-items-overflow";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  subtitle?: string;
  layout?: "grid" | "inlineStrip" | "compactRow";
  registrationNo?: string;
  items: TrustBadgeItem[];
  locale: string;
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

export function TrustBadgesView({
  title,
  subtitle,
  layout = "grid",
  registrationNo,
  items,
  locale,
  block,
  overflow,
}: Props) {
  return (
    <AnimatedSection>
      {title && <SectionHeader title={title} subtitle={subtitle} />}
      {registrationNo && (
        <p className="-mt-8 mb-8 text-center text-sm font-medium text-primary">
          {registrationNo}
        </p>
      )}
      {block && overflow ? (
        <MarketingItemsOverflow
          block={block}
          overflowFlags={overflow.flags}
          previewDevice={overflow.previewDevice}
          items={items}
          columns={4}
          gridClassName="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6"
          getItemKey={(item) => item.id}
          renderItem={(item) => (
            <TrustBadgeCard item={item} locale={locale} compact={layout === "compactRow"} />
          )}
          accordionRender={(item) => {
            const label = resolveItemField(item, "label", locale);
            const desc = resolveItemField(item, "description", locale);
            return { title: label, body: desc };
          }}
        />
      ) : (
        <div
          className={cn(
            layout === "grid" && "grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6",
            layout === "inlineStrip" && "flex flex-wrap items-center justify-center gap-6",
            layout === "compactRow" && "flex flex-wrap items-center justify-center gap-4"
          )}
        >
          {items.map((item) => (
            <TrustBadgeCard
              key={item.id}
              item={item}
              locale={locale}
              compact={layout === "compactRow"}
            />
          ))}
        </div>
      )}
    </AnimatedSection>
  );
}

function TrustBadgeCard({
  item,
  locale,
  compact,
}: {
  item: TrustBadgeItem;
  locale: string;
  compact?: boolean;
}) {
  const Icon = resolveMarketingIcon(item.icon);
  const label = resolveItemField(item, "label", locale);
  const desc = resolveItemField(item, "description", locale);

  const inner = (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        compact
          ? "rounded-lg border border-border/40 p-3"
          : "rounded-xl border border-border/60 bg-card p-6 shadow-sm"
      )}
    >
      {item.imageUrl ? (
        <div className={cn("relative mb-3", compact ? "h-8 w-16" : "h-12 w-24")}>
          <Image src={item.imageUrl} alt={label} fill className="object-contain" sizes="96px" />
        </div>
      ) : (
        <div
          className={cn(
            "mb-3 flex items-center justify-center rounded-full bg-primary/10 text-primary",
            compact ? "h-8 w-8" : "h-12 w-12"
          )}
        >
          <Icon className={compact ? "h-4 w-4" : "h-6 w-6"} />
        </div>
      )}
      <span className={cn("font-medium text-card-foreground", compact ? "text-xs" : "text-sm")}>
        {label}
      </span>
      {desc && !compact && <p className="mt-1 text-xs text-card-foreground/75">{desc}</p>}
    </div>
  );

  if (item.href) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="block transition hover:opacity-80"
      >
        {inner}
      </a>
    );
  }
  return inner;
}
