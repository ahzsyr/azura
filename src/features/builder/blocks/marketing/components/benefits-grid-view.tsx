"use client";

import Image from "next/image";
import { SectionHeader } from "@/components/marketing/section";
import { AnimatedSection } from "@/components/motion/lazy-motion";
import type { PublicLocale } from "@/i18n/locale-config";
import { resolveMarketingIcon } from "@/features/builder/blocks/marketing/lib/icon-map";
import { resolveItemField } from "@/features/builder/blocks/marketing/lib/resolve-item-locale";
import type { GridItem } from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { MarketingItemsOverflow } from "@/features/builder/components/marketing-items-overflow";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  subtitle?: string;
  layout?: "cards" | "list" | "numbered" | "twoColumn";
  emphasis?: "outcome" | "metric";
  items: GridItem[];
  locale: string;
  enabledLocales?: PublicLocale[];
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

export function BenefitsGridView({
  title,
  subtitle,
  layout = "cards",
  emphasis = "outcome",
  items,
  locale,
  block,
  overflow,
}: Props) {
  const renderBenefitCard = (item: GridItem) => (
    <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card to-muted/30 p-6">
      <BenefitContent item={item} locale={locale} emphasis={emphasis} showIcon />
    </div>
  );

  return (
    <AnimatedSection>
      {title && <SectionHeader title={title} subtitle={subtitle} />}
      {block && overflow ? (
        <MarketingItemsOverflow
          block={block}
          overflowFlags={overflow.flags}
          previewDevice={overflow.previewDevice}
          items={items}
          columns={layout === "twoColumn" ? 2 : 3}
          gridClassName={
            layout === "twoColumn" ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"
          }
          getItemKey={(item) => item.id}
          renderItem={(item) =>
            layout === "list" ? (
              <BenefitListItem item={item} locale={locale} emphasis={emphasis} />
            ) : layout === "numbered" ? (
              <div className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {items.indexOf(item) + 1}
                </span>
                <BenefitContent item={item} locale={locale} emphasis={emphasis} />
              </div>
            ) : (
              renderBenefitCard(item)
            )
          }
          accordionRender={(item) => ({
            title: resolveItemField(item, "title", locale),
            body: resolveItemField(item, "description", locale),
          })}
        />
      ) : (
        <>
          {layout === "list" && (
            <ul className="mx-auto max-w-3xl space-y-6">
              {items.map((item) => (
                <BenefitListItem key={item.id} item={item} locale={locale} emphasis={emphasis} />
              ))}
            </ul>
          )}
          {layout === "numbered" && (
            <ol className="mx-auto max-w-3xl space-y-8">
              {items.map((item, i) => (
                <li key={item.id} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <BenefitContent item={item} locale={locale} emphasis={emphasis} />
                </li>
              ))}
            </ol>
          )}
          {(layout === "cards" || layout === "twoColumn") && (
            <div
              className={cn(
                "grid gap-6",
                layout === "twoColumn" ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"
              )}
            >
              {items.map((item) => (
                <div key={item.id}>{renderBenefitCard(item)}</div>
              ))}
            </div>
          )}
        </>
      )}
    </AnimatedSection>
  );
}

function BenefitListItem({
  item,
  locale,
  emphasis,
}: {
  item: GridItem;
  locale: string;
  emphasis: "outcome" | "metric";
}) {
  const Icon = resolveMarketingIcon(item.icon);
  return (
    <li className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <BenefitContent item={item} locale={locale} emphasis={emphasis} />
    </li>
  );
}

function BenefitContent({
  item,
  locale,
  emphasis,
  showIcon,
}: {
  item: GridItem;
  locale: string;
  emphasis: "outcome" | "metric";
  showIcon?: boolean;
}) {
  const Icon = resolveMarketingIcon(item.icon);
  const metric = resolveItemField(item, "metric", locale);
  return (
    <div>
      {showIcon && item.icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      )}
      {emphasis === "metric" && metric && (
        <p className="mb-1 text-2xl font-bold text-primary">{metric}</p>
      )}
      <h3 className="font-heading text-lg font-semibold text-card-foreground">
        {resolveItemField(item, "title", locale)}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-card-foreground/75">
        {resolveItemField(item, "description", locale)}
      </p>
      {item.imageUrl && (
        <div className="relative mt-4 aspect-video overflow-hidden rounded-lg">
          <Image src={item.imageUrl} alt="" fill className="object-cover" sizes="400px" />
        </div>
      )}
    </div>
  );
}
