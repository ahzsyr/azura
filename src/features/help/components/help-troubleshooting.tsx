"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { helpHref } from "@/features/help/lib/help-href";
import type { HelpFaq, HelpTroubleshooting } from "@/features/help/types";

export function HelpTroubleshootingList({ items }: { items: HelpTroubleshooting[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = items.find((i) => i.id === activeId) ?? null;

  if (!items.length) return null;

  return (
    <section id="section-troubleshooting" className="space-y-4 scroll-mt-24">
      <h2 className="text-lg font-medium">Troubleshooting</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <button
            key={item.id}
            id={`trouble-card-${item.id}`}
            type="button"
            onClick={() => setActiveId(item.id)}
            className="rounded-xl border p-4 text-start transition-colors hover:bg-muted/40"
          >
            <p className="font-medium">{item.title}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.problem}</p>
          </button>
        ))}
      </div>

      <Sheet open={Boolean(active)} onOpenChange={(open) => !open && setActiveId(null)}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
          {active && (
            <>
              <SheetHeader className="text-start">
                <SheetTitle>{active.title}</SheetTitle>
                <SheetDescription>{active.problem}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <div>
                  <p className="font-medium">Why it happens</p>
                  <ul className="mt-1 list-disc space-y-1 ps-5 text-muted-foreground">
                    {active.causes.map((cause) => (
                      <li key={cause}>{cause}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium">How to fix</p>
                  <ul className="mt-1 list-disc space-y-1 ps-5 text-muted-foreground">
                    {active.fixes.map((fix) => (
                      <li key={fix}>{fix}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2">
                  {active.links.map((link) => (
                    <Link
                      key={link.href}
                      href={helpHref(link.href)}
                      className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}

export function HelpFaqList({ faqs }: { faqs: HelpFaq[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = faqs.find((f) => f.id === activeId) ?? null;

  if (!faqs.length) return null;

  return (
    <section id="section-faq" className="space-y-4 scroll-mt-24">
      <h2 className="text-lg font-medium">FAQ</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {faqs.map((faq) => (
          <button
            key={faq.id}
            id={`faq-card-${faq.id}`}
            type="button"
            onClick={() => setActiveId(faq.id)}
            className="rounded-xl border p-4 text-start transition-colors hover:bg-muted/40"
          >
            <p className="font-medium">{faq.question}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{faq.answer}</p>
          </button>
        ))}
      </div>

      <Sheet open={Boolean(active)} onOpenChange={(open) => !open && setActiveId(null)}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
          {active && (
            <>
              <SheetHeader className="text-start">
                <SheetTitle>{active.question}</SheetTitle>
                <SheetDescription className="text-sm leading-relaxed text-foreground">
                  {active.answer}
                </SheetDescription>
              </SheetHeader>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
