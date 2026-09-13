"use client";

import { useMemo, useState } from "react";
import { FAQAccordion, type FaqItem } from "@/components/marketing/faq-accordion";
import { getLocalizedField } from "@/lib/utils";

type Props = {
  faqs: FaqItem[];
  locale: string;
  searchable?: boolean;
  layoutMode?: "accordion" | "grid";
};

export function ProductFaqSearchable({ faqs, locale, searchable, layoutMode = "accordion" }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter((faq) => {
      const question = getLocalizedField(faq, "question", locale, {
        includeLegacySuffixFields: true,
      }).toLowerCase();
      const answer = getLocalizedField(faq, "answer", locale, {
        includeLegacySuffixFields: true,
      }).toLowerCase();
      return question.includes(q) || answer.includes(q);
    });
  }, [faqs, query, locale]);

  return (
    <div className="space-y-4">
      {searchable ? (
        <input
          type="search"
          placeholder="Search questions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-md border rounded-md h-9 px-3 text-sm"
        />
      ) : null}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matching questions.</p>
      ) : (
        <FAQAccordion faqs={filtered} locale={locale} layoutMode={layoutMode} />
      )}
    </div>
  );
}
