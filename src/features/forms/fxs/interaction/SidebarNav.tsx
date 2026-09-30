"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FxsSidebarSection } from "../types";

export function SidebarNav({
  sections,
  compact = false,
  className,
}: {
  sections: FxsSidebarSection[];
  compact?: boolean;
  className?: string;
}) {
  if (!sections.length) return null;

  const completedCount = sections.filter((section) => section.completed).length;
  const progress = Math.round((completedCount / sections.length) * 100);

  if (compact) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-1.5" aria-label="Form progress">
          {sections.map((section) => (
            <span
              key={section.id}
              aria-current={section.active ? "step" : undefined}
              className={cn(
                "h-2.5 flex-1 rounded-full transition-colors",
                section.active
                  ? "bg-primary"
                  : section.completed
                    ? "bg-primary/40"
                    : "bg-muted",
              )}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{progress}% complete</p>
      </div>
    );
  }

  return (
    <div className={cn("fxs-sidebar-nav space-y-3", className)}>
      <ol className="space-y-1.5" aria-label="Form sections">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={section.active ? "step" : undefined}
              className={cn(
                "fxs-sidebar-nav-item flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                section.active
                  ? "bg-primary/8 text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                  section.active
                    ? "border-primary bg-primary/10 text-primary"
                    : section.completed
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground",
                )}
              >
                {section.completed ? <Check className="size-3" aria-hidden /> : null}
              </span>
              <span className="min-w-0 truncate">{section.title}</span>
            </a>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">{progress}% complete</p>
    </div>
  );
}
