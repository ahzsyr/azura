"use client";

import { SectionHeader } from "@/components/marketing/section";
import { AnimatedCounter } from "@/features/marketing-blocks/components/animated-counter";
import { MiniStatChart } from "@/features/marketing-blocks/components/mini-stat-chart";
import { resolveMarketingIcon } from "@/features/marketing-blocks/lib/icon-map";
import { resolveItemField } from "@/features/marketing-blocks/lib/resolve-item-locale";
import type { StatItem } from "@/features/marketing-blocks/schemas/marketing-blocks";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { MarketingItemsOverflow } from "@/features/builder/components/marketing-items-overflow";
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

  const renderStat = (item: StatItem) => (
    <StatCard
      item={item}
      locale={locale}
      animateOnView={animateOnView}
      featured={featured}
    />
  );

  return (
    <div>
      {title && <SectionHeader title={title} subtitle={subtitle} />}
      {block && overflow ? (
        <MarketingItemsOverflow
          block={block}
          overflowFlags={overflow.flags}
          previewDevice={overflow.previewDevice}
          items={items}
          columns={colCount}
          gridClassName={cn(
            "gap-8",
            layout === "row" && "flex flex-wrap justify-center gap-8 md:gap-16 !grid-cols-none",
            layout === "grid" && columnClasses[colCount],
            layout === "featuredCenter" && "mx-auto max-w-4xl sm:grid-cols-3"
          )}
          getItemKey={(item) => item.id}
          renderItem={renderStat}
          accordionRender={(item) => {
            const label = resolveItemField(item, "label", locale);
            const desc = resolveItemField(item, "description", locale);
            return { title: label, body: desc || renderStat(item) };
          }}
        />
      ) : (
        <div
          className={cn(
            layout === "row" && "flex flex-wrap justify-center gap-8 md:gap-16",
            layout === "grid" && cn("grid gap-8", columnClasses[4]),
            layout === "featuredCenter" && "mx-auto grid max-w-4xl gap-8 sm:grid-cols-3"
          )}
        >
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
    </div>
  );
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
        "flex flex-col items-center text-center",
        featured && "rounded-xl border border-border/60 bg-card p-6"
      )}
    >
      {item.icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <p className={cn("font-heading font-bold text-primary", featured ? "text-5xl" : "text-4xl")}>
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
