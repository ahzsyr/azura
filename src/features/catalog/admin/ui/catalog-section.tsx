"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CatalogSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function CatalogSection({
  title,
  description,
  children,
  className,
}: CatalogSectionProps) {
  return (
    <section
      className={cn(
        "space-y-3 rounded-xl border border-border/70 bg-background p-4",
        className,
      )}
    >
      <header className="space-y-0.5 border-b border-border/60 pb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
