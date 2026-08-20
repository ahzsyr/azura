"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn, getLocalizedField } from "@/lib/utils";
export type FaqItem = {
  id: string;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
};

export function FAQAccordion({
  faqs,
  locale,
  layoutMode = "accordion",
}: {
  faqs: FaqItem[];
  locale: string;
  layoutMode?: "accordion" | "grid";
}) {
  const localizedQuestion = (faq: FaqItem) =>
    getLocalizedField(faq, "question", locale, { includeLegacySuffixFields: true });
  const localizedAnswer = (faq: FaqItem) =>
    getLocalizedField(faq, "answer", locale, { includeLegacySuffixFields: true });

  if (layoutMode === "grid") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {faqs.map((faq) => (
          <div key={faq.id} className="rounded-xl border border-border/60 p-6">
            <h3 className="font-medium">{localizedQuestion(faq)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {localizedAnswer(faq)}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Accordion.Root
      type="single"
      collapsible
      defaultValue={faqs[0]?.id}
      className="space-y-3"
    >
      {faqs.map((faq) => (
        <Accordion.Item
          key={faq.id}
          value={faq.id}
          className="overflow-hidden rounded-xl border border-border/60"
        >
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between px-6 py-4 text-start font-medium transition hover:bg-muted/50">
              {localizedQuestion(faq)}
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-all duration-200 group-data-[state=open]:rotate-180 group-data-[state=open]:text-foreground" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-[faq-accordion-up_240ms_ease-out] data-[state=open]:animate-[faq-accordion-down_240ms_ease-out]">
            <div className="px-6 pb-4 text-sm leading-relaxed text-muted-foreground">
              {localizedAnswer(faq)}
            </div>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

export function VisaTimeline({
  steps,
  locale,
}: {
  steps: Array<{ titleEn: string; titleAr: string; descEn: string; descAr: string }>;
  locale: string;
}) {
  return (
    <div className="relative space-y-8 before:absolute before:start-4 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border md:before:start-1/2">
      {steps.map((step, i) => {
        const title = getLocalizedField(step, "title", locale);
        const desc = getLocalizedField(step, "desc", locale);
        return (
          <div
            key={title}
            className={cn(
              "relative flex flex-col gap-4 md:flex-row md:items-center",
              i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
            )}
          >
            <div className="absolute start-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white md:start-1/2 md:-translate-x-1/2">
              {i + 1}
            </div>
            <div className={cn("ms-12 rounded-xl border p-6 md:w-[calc(50%-2rem)]", i % 2 === 0 ? "md:me-auto md:ms-0 md:pe-8" : "md:ms-auto md:pe-0 md:ps-8")}>
              <h3 className="font-heading font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
