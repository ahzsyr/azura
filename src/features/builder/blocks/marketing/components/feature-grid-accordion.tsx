"use client";

import type { ReactNode } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { id: string };

type Props<T extends Item> = {
  items: T[];
  allowMultiple: boolean;
  openFirst: boolean;
  itemClassName?: string;
  renderHeader: (item: T, index: number) => ReactNode;
  renderPanel: (item: T, index: number) => ReactNode;
};

export function FeatureGridAccordion<T extends Item>({
  items,
  allowMultiple,
  openFirst,
  itemClassName,
  renderHeader,
  renderPanel,
}: Props<T>) {
  if (items.length === 0) return null;

  const firstId = items[0]?.id;
  const rootProps = allowMultiple
    ? {
        type: "multiple" as const,
        defaultValue: openFirst && firstId ? [firstId] : [],
      }
    : {
        type: "single" as const,
        collapsible: true,
        defaultValue: openFirst && firstId ? firstId : undefined,
      };

  return (
    <Accordion.Root key={items.map((item) => item.id).join("|")} {...rootProps} className="space-y-3">
      {items.map((item, index) => (
        <Accordion.Item
          key={item.id}
          value={item.id}
          className={cn("overflow-hidden rounded-xl border border-border/60", itemClassName)}
        >
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center gap-3 px-6 py-4 text-start font-medium transition hover:bg-muted/40">
              <span className="min-w-0 flex-1">{renderHeader(item, index)}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-[faq-accordion-up_240ms_ease-out] data-[state=open]:animate-[faq-accordion-down_240ms_ease-out] motion-reduce:animate-none">
            <div className="px-6 pb-4">{renderPanel(item, index)}</div>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
