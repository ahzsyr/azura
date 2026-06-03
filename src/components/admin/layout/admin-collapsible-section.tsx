"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminAccordionContent } from "./admin-motion";

type AdminCollapsibleSectionProps = {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function AdminCollapsibleSection({
  title,
  description,
  defaultOpen = true,
  children,
  className,
}: AdminCollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={cn("rounded-xl border bg-card", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 p-4 text-start transition-colors hover:bg-muted/40"
        aria-expanded={open}
      >
        <div>
          <h3 className="font-medium">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        <ChevronDown
          className={cn("mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      <AdminAccordionContent open={open}>
        <div className="border-t px-4 pb-4 pt-2">{children}</div>
      </AdminAccordionContent>
    </section>
  );
}
