"use client";

import type { FaqItem } from "@/components/marketing/faq-accordion";
import { getLocalizedField } from "@/lib/utils";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { MarketingItemsOverflow } from "@/features/builder/components/marketing-items-overflow";
import { FAQAccordion } from "@/components/marketing/faq-accordion";

type Props = {
  faqs: FaqItem[];
  locale: string;
  block: BlockNode;
  overflow: BlockOverflowContext;
};

export function FaqItemsOverflow({ faqs, locale, block, overflow }: Props) {
  const localizedQuestion = (faq: FaqItem) =>
    getLocalizedField(faq, "question", locale, { includeLegacySuffixFields: true });
  const localizedAnswer = (faq: FaqItem) =>
    getLocalizedField(faq, "answer", locale, { includeLegacySuffixFields: true });

  return (
    <MarketingItemsOverflow
      block={block}
      overflowFlags={overflow.flags}
      previewDevice={overflow.previewDevice}
      items={faqs}
      getItemKey={(faq) => faq.id}
      gridClassName="grid gap-4 md:grid-cols-2"
      columns={2}
      renderItem={(faq) => (
        <div className="rounded-xl border border-border/60 p-6">
          <h3 className="font-medium">{localizedQuestion(faq)}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {localizedAnswer(faq)}
          </p>
        </div>
      )}
      accordionRender={(faq) => ({
        title: localizedQuestion(faq),
        body: localizedAnswer(faq),
      })}
    />
  );
}

/** Legacy accordion when overflow resolves to accordion on all breakpoints */
export function FaqItemsLegacy({ faqs, locale, layoutMode }: { faqs: FaqItem[]; locale: string; layoutMode?: "accordion" | "grid" }) {
  return <FAQAccordion faqs={faqs} locale={locale} layoutMode={layoutMode} />;
}
