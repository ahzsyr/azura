"use client";

import { useEffect, useState, Fragment, type ReactNode } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import type { DeviceBreakpoint, ResolvedContentOverflow } from "@/types/block-system";
import { useStableDeviceBreakpoint } from "@/lib/hooks/use-stable-device-breakpoint";
import { usePreferNativeSliderTrack } from "@/lib/hooks/use-prefer-native-slider-track";
import { cn } from "@/lib/utils";

export type ResponsiveOverflowLayoutProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  getItemKey: (item: T, index: number) => string;
  flags: Record<DeviceBreakpoint, ResolvedContentOverflow>;
  /** Grid column classes e.g. "md:grid-cols-2 lg:grid-cols-3" */
  gridClassName?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
  autoplay?: boolean;
  autoplayIntervalMs?: number;
  sliderItemClassName?: string;
  sliderSnapMinWidth?: string;
  showMoreLabels?: { more: string; less: string };
  /** Accordion: extract title/body from item */
  accordionRender?: (item: T, index: number) => { title: ReactNode; body: ReactNode };
  className?: string;
};

function columnGridClass(columns: number | undefined, gridClassName?: string): string {
  if (gridClassName?.includes("pl-grid")) {
    return gridClassName;
  }
  if (gridClassName?.includes("columns-")) {
    return gridClassName;
  }
  if (gridClassName?.includes("flex")) {
    return cn("gap-6", gridClassName);
  }
  if (gridClassName) return cn("grid grid-cols-1 gap-6", gridClassName);
  const map: Record<number, string> = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
    5: "md:grid-cols-2 lg:grid-cols-5",
    6: "md:grid-cols-3 lg:grid-cols-6",
  };
  return cn("grid grid-cols-1 gap-6", columns ? map[columns] ?? "" : "md:grid-cols-2 lg:grid-cols-3");
}

function OverflowSlider<T>({
  items,
  renderItem,
  getItemKey,
  autoplay,
  autoplayIntervalMs,
  columns,
  sliderItemClassName,
  useSimpleTrack,
}: Pick<
  ResponsiveOverflowLayoutProps<T>,
  | "items"
  | "renderItem"
  | "getItemKey"
  | "autoplay"
  | "autoplayIntervalMs"
  | "columns"
  | "sliderItemClassName"
> & { useSimpleTrack?: boolean }) {
  const [api, setApi] = useState<CarouselApi>();
  const preferNativeTrack = usePreferNativeSliderTrack();
  // Explicit prop must win:
  // - true  => force native track
  // - false => force carousel with arrow controls
  // - undefined => auto-detect by device pointer heuristics
  const useNativeTrack =
    typeof useSimpleTrack === "boolean" ? useSimpleTrack : preferNativeTrack;

  useEffect(() => {
    if (!api || !autoplay || useNativeTrack) return;
    const interval = window.setInterval(() => {
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, autoplayIntervalMs ?? 5000);
    return () => window.clearInterval(interval);
  }, [api, autoplay, autoplayIntervalMs, useNativeTrack]);

  if (useNativeTrack) {
    return (
      <div className="block-overflow-slider-track">
        {items.map((item, i) => (
          <div
            key={getItemKey(item, i)}
            className={cn(
              sliderItemClassName ? undefined : "min-w-[280px] max-w-sm",
              sliderItemClassName,
            )}
          >
            {renderItem(item, i)}
          </div>
        ))}
      </div>
    );
  }

  const slidesPerView = columns ?? 3;
  const basis =
    slidesPerView >= 3
      ? "basis-full sm:basis-1/2 lg:basis-1/3"
      : slidesPerView === 2
        ? "basis-full sm:basis-1/2"
        : "basis-full";

  return (
    <Carousel
      setApi={setApi}
      opts={{ align: "start", loop: true }}
      className="mx-auto w-full max-w-6xl px-0 sm:px-10"
    >
      <CarouselContent className="-ms-4">
        {items.map((item, i) => (
          <CarouselItem key={getItemKey(item, i)} className={cn("ps-4", basis, sliderItemClassName)}>
            {renderItem(item, i)}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}

function OverflowShowMore<T>({
  items,
  renderItem,
  getItemKey,
  limit,
  labels,
  stackClassName,
}: {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  getItemKey: (item: T, index: number) => string;
  limit: number;
  labels: { more: string; less: string };
  stackClassName?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, limit);
  const hasMore = items.length > limit;
  const stackLayout = stackClassName?.includes("flex");

  return (
    <div className={stackLayout ? "space-y-2" : "space-y-4"}>
      <div className={cn(stackClassName ?? "block-overflow-stack")}>
        {visible.map((item, i) =>
          stackLayout ? (
            <Fragment key={getItemKey(item, i)}>{renderItem(item, i)}</Fragment>
          ) : (
            <div key={getItemKey(item, i)}>{renderItem(item, i)}</div>
          ),
        )}
      </div>
      {hasMore && (
        <div className={stackLayout ? "text-start" : "text-center"}>
          <Button type="button" variant="outline" size="sm" onClick={() => setExpanded((e) => !e)}>
            {expanded ? labels.less : labels.more}
          </Button>
        </div>
      )}
    </div>
  );
}

function OverflowAccordion<T>({
  items,
  getItemKey,
  accordionRender,
}: {
  items: T[];
  getItemKey: (item: T, index: number) => string;
  accordionRender: (item: T, index: number) => { title: ReactNode; body: ReactNode };
}) {
  const firstValue = items.length > 0 ? getItemKey(items[0], 0) : undefined;
  return (
    <Accordion.Root type="single" collapsible defaultValue={firstValue} className="space-y-3">
      {items.map((item, i) => {
        const key = getItemKey(item, i);
        const { title, body } = accordionRender(item, i);
        return (
          <Accordion.Item key={key} value={key} className="overflow-hidden rounded-xl border border-border/60">
            <Accordion.Header>
              <Accordion.Trigger className="group flex w-full items-center justify-between px-6 py-4 text-start font-medium transition hover:bg-muted/50">
                {title}
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-all duration-200 group-data-[state=open]:rotate-180 group-data-[state=open]:text-foreground" />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="overflow-hidden data-[state=closed]:animate-[faq-accordion-up_240ms_ease-out] data-[state=open]:animate-[faq-accordion-down_240ms_ease-out]">
              <div className="px-6 pb-4 text-sm leading-relaxed text-muted-foreground">{body}</div>
            </Accordion.Content>
          </Accordion.Item>
        );
      })}
    </Accordion.Root>
  );
}

function OverflowShell<T>({
  resolved,
  items,
  renderItem,
  getItemKey,
  gridClassName,
  columns,
  autoplay,
  autoplayIntervalMs,
  sliderItemClassName,
  showMoreLabels,
  accordionRender,
  useSimpleSliderTrack,
}: {
  resolved: ResolvedContentOverflow;
} & Omit<ResponsiveOverflowLayoutProps<T>, "flags" | "className"> & {
  useSimpleSliderTrack?: boolean;
}) {
  if (items.length === 0) return null;

  const mode =
    resolved.effectiveMode === "slider" && resolved.sliderEnabled
      ? "slider"
      : resolved.effectiveMode === "collapse"
        ? "collapse"
        : "grid";

  if (mode === "slider") {
    return (
      <OverflowSlider
        items={items}
        renderItem={renderItem}
        getItemKey={getItemKey}
        autoplay={autoplay}
        autoplayIntervalMs={autoplayIntervalMs}
        columns={columns}
        sliderItemClassName={sliderItemClassName}
        useSimpleTrack={useSimpleSliderTrack}
      />
    );
  }

  if (mode === "collapse") {
    const variant = resolved.collapseVariant;
    if (variant === "accordion" && accordionRender) {
      return (
        <OverflowAccordion items={items} getItemKey={getItemKey} accordionRender={accordionRender} />
      );
    }
    if (variant === "show_more") {
      const chipStack = gridClassName?.includes("flex") ? gridClassName : undefined;
      return (
        <OverflowShowMore
          items={items}
          renderItem={renderItem}
          getItemKey={getItemKey}
          limit={resolved.showMoreLimit}
          labels={showMoreLabels ?? { more: "Show more", less: "Show less" }}
          stackClassName={chipStack}
        />
      );
    }
    return (
      <div className="block-overflow-stack">
        {items.map((item, i) => (
          <div key={getItemKey(item, i)}>{renderItem(item, i)}</div>
        ))}
      </div>
    );
  }

  return (
    <div className={columnGridClass(columns, gridClassName)}>
      {items.map((item, i) => (
        <div key={getItemKey(item, i)}>{renderItem(item, i)}</div>
      ))}
    </div>
  );
}

export function ResponsiveOverflowLayout<T>({
  items,
  renderItem,
  getItemKey,
  flags,
  gridClassName,
  columns,
  autoplay,
  autoplayIntervalMs,
  sliderItemClassName,
  showMoreLabels,
  accordionRender,
  className,
  useSimpleSliderTrack,
}: ResponsiveOverflowLayoutProps<T> & { useSimpleSliderTrack?: boolean }) {
  if (items.length === 0) return null;

  const allSame =
    JSON.stringify(flags.mobile) === JSON.stringify(flags.tablet) &&
    JSON.stringify(flags.tablet) === JSON.stringify(flags.desktop);

  const activeDevice = useStableDeviceBreakpoint();

  if (allSame) {
    return (
      <div className={className}>
        <OverflowShell
          resolved={flags.desktop}
          items={items}
          renderItem={renderItem}
          getItemKey={getItemKey}
          gridClassName={gridClassName}
          columns={columns}
          autoplay={autoplay}
          autoplayIntervalMs={autoplayIntervalMs}
          sliderItemClassName={sliderItemClassName}
          showMoreLabels={showMoreLabels}
          accordionRender={accordionRender}
          useSimpleSliderTrack={useSimpleSliderTrack}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="block-overflow-shell" data-device-shell={activeDevice}>
        <OverflowShell
          resolved={flags[activeDevice]}
          items={items}
          renderItem={renderItem}
          getItemKey={getItemKey}
          gridClassName={gridClassName}
          columns={columns}
          autoplay={autoplay}
          autoplayIntervalMs={autoplayIntervalMs}
          sliderItemClassName={sliderItemClassName}
          showMoreLabels={showMoreLabels}
          accordionRender={accordionRender}
          useSimpleSliderTrack={useSimpleSliderTrack}
        />
      </div>
    </div>
  );
}

/** Single-device layout (preview / explicit device context) */
export function ResponsiveOverflowLayoutForDevice<T>(
  props: ResponsiveOverflowLayoutProps<T> & {
    device: DeviceBreakpoint;
    useSimpleSliderTrack?: boolean;
  }
) {
  const { device, flags, className, ...rest } = props;
  return (
    <div className={className}>
      <OverflowShell resolved={flags[device]} {...rest} useSimpleSliderTrack={props.useSimpleSliderTrack} />
    </div>
  );
}
