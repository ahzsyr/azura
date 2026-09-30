"use client";

import dynamic from "next/dynamic";
import { ChevronDown } from "lucide-react";
import { AdminAccordionContent } from "@/components/admin/layout/admin-motion";
import { cn } from "@/lib/utils";
import type { HelpSection } from "@/features/help/types";

const HelpSectionBody = dynamic(
  () =>
    import("@/features/help/components/help-section-body").then((m) => m.HelpSectionBody),
  {
    loading: () => (
      <p className="px-4 py-3 text-sm text-muted-foreground">Loading section…</p>
    ),
    ssr: false,
  }
);

export function HelpSectionAccordion({
  section,
  open,
  loaded,
  onToggle,
  onOpenTopic,
}: {
  section: HelpSection;
  open: boolean;
  loaded: boolean;
  onToggle: () => void;
  onOpenTopic: (topicId: string) => void;
}) {
  const Icon = section.icon;

  return (
    <section id={section.id} className="admin-collapsible scroll-mt-24 rounded-xl border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 p-4 text-start transition-colors hover:bg-muted/40"
        aria-expanded={open}
      >
        <div className="flex gap-3">
          {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />}
          <div>
            <h3 className="font-medium">{section.title}</h3>
            {section.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{section.description}</p>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <AdminAccordionContent open={open}>
        <div className="border-t px-4 pb-4 pt-2">
          {loaded ? (
            <HelpSectionBody section={section} onOpenTopic={onOpenTopic} />
          ) : null}
        </div>
      </AdminAccordionContent>
    </section>
  );
}
