"use client";

import { SectionHeader } from "@/components/marketing/section";
import { AnimatedSection } from "@/components/motion/lazy-motion";
import { AnimatedCounter } from "@/features/builder/blocks/marketing/components/animated-counter";
import { MiniStatChart } from "@/features/builder/blocks/marketing/components/mini-stat-chart";
import { resolveMarketingIcon } from "@/features/builder/blocks/marketing/lib/icon-map";
import { resolveItemField } from "@/features/builder/blocks/marketing/lib/resolve-item-locale";
import type { StatItem } from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import {
  MarketingItemsOverflow,
  shouldUseResponsiveOverflow,
} from "@/features/builder/components/marketing-items-overflow";
import { useResolvedVisualExperience } from "@/components/theme/visual-experience-context";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  subtitle?: string;
  layout?: "row" | "grid" | "featuredCenter";
  animateOnView?: boolean;
  items: StatItem[];
  locale: string;
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

const columnClasses = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
} as const;

function resolveLayoutClassName(
  layout: "row" | "grid" | "featuredCenter",
  colCount: 2 | 3 | 4,
): string {
  if (layout === "row") {
    return "flex flex-wrap justify-center gap-6 sm:gap-8 md:gap-16";
  }
  if (layout === "featuredCenter") {
    return cn(
      "mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8",
    );
  }
  return cn("grid grid-cols-1 gap-6 sm:gap-8", columnClasses[colCount]);
}

function resolveOverflowGridClassName(
  layout: "row" | "grid" | "featuredCenter",
  colCount: 2 | 3 | 4,
): string {
  if (layout === "row") {
    return "flex flex-wrap justify-center gap-6 sm:gap-8 md:gap-16";
  }
  if (layout === "featuredCenter") {
    return "mx-auto max-w-4xl sm:grid-cols-3";
  }
  return columnClasses[colCount];
}

export function StatsCounterView({
  title,
  subtitle,
  layout = "grid",
  animateOnView = true,
  items,
  locale,
  block,
  overflow,
}: Props) {
  const featured = layout === "featuredCenter";
  const colCount = Math.min(Math.max(items.length, 2), 4) as 2 | 3 | 4;
  const useOverflow =
    Boolean(block && overflow && shouldUseResponsiveOverflow(overflow.flags));
  const resolved = useResolvedVisualExperience();
  const animationsEnabled = resolved?.animationsEnabled !== false;

  const renderStat = (item: StatItem) => (
    <StatCard
      item={item}
      locale={locale}
      animateOnView={animateOnView}
      featured={featured}
    />
  );

  const layoutClassName = resolveLayoutClassName(layout, colCount);

  const content = (
    <>
      {title && <SectionHeader title={title} subtitle={subtitle} />}
      {useOverflow ? (
        <MarketingItemsOverflow
          block={block!}
          overflowFlags={overflow!.flags}
          previewDevice={overflow!.previewDevice}
          items={items}
          columns={colCount}
          gridClassName={resolveOverflowGridClassName(layout, colCount)}
          sliderItemClassName="w-full min-w-0 max-w-full basis-full sm:min-w-[240px] sm:max-w-sm"
          getItemKey={(item) => item.id}
          renderItem={renderStat}
          accordionRender={(item) => {
            const label = resolveItemField(item, "label", locale);
            const desc = resolveItemField(item, "description", locale);
            return { title: label, body: desc || renderStat(item) };
          }}
        />
      ) : (
        <div className={layoutClassName}>
          {items.map((item) => (
            <StatCard
              key={item.id}
              item={item}
              locale={locale}
              animateOnView={animateOnView}
              featured={featured}
            />
          ))}
        </div>
      )}
    </>
  );

  if (animationsEnabled) {
    return <AnimatedSection>{content}</AnimatedSection>;
  }

  return <div>{content}</div>;
}

function StatCard({
  item,
  locale,
  animateOnView,
  featured,
}: {
  item: StatItem;
  locale: string;
  animateOnView: boolean;
  featured?: boolean;
}) {
  const Icon = resolveMarketingIcon(item.icon);
  const label = resolveItemField(item, "label", locale);
  const desc = resolveItemField(item, "description", locale);
  const chartType = item.chartType ?? "none";
  const chartData = item.chartData ?? [];

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col items-center px-2 text-center",
        featured && "rounded-xl border border-border/60 bg-card p-4 sm:p-6",
      )}
    >
      {item.icon && (
        <div className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <p
        className={cn(
          "font-heading font-bold text-primary",
          featured ? "text-3xl sm:text-5xl" : "text-3xl sm:text-4xl",
        )}
      >
        <AnimatedCounter
          value={item.value}
          prefix={item.prefix}
          suffix={item.suffix}
          animateOnView={animateOnView}
        />
      </p>
      {chartType !== "none" && chartData.length > 0 && (
        <div className="my-2">
          <MiniStatChart type={chartType === "donut" ? "donut" : "bar"} data={chartData} />
        </div>
      )}
      <p className="mt-2 font-medium text-foreground">{label}</p>
      {desc && <p className="mt-1 text-sm text-foreground/70">{desc}</p>}
    </div>
  );
}
