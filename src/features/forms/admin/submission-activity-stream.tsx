"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import type { ActivityItem } from "@/features/forms/admin/submission-activity";
import { cn } from "@/lib/utils";

export type { ActivityItem };

function startOfDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function dateGroupLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const day = startOfDay(d);
  if (day === startOfDay(today)) return "Today";
  if (day === startOfDay(yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: d.getUTCFullYear() !== today.getUTCFullYear() ? "numeric" : undefined,
  });
}

function timeOnlyLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SubmissionActivityStream({
  items,
  className,
  maxHeightClassName = "max-h-[450px]",
}: {
  items: ActivityItem[];
  className?: string;
  /** Tailwind max-height class for the scrollable body. */
  maxHeightClassName?: string;
}) {
  const grouped = useMemo(() => {
    const groups: Array<{ label: string; items: ActivityItem[] }> = [];
    for (const item of items) {
      const label = dateGroupLabel(item.at);
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.items.push(item);
      } else {
        groups.push({ label, items: [item] });
      }
    }
    return groups;
  }, [items]);

  if (items.length === 0) {
    return (
      <Card className={cn("p-4", className)}>
        <h3 className="font-medium text-sm mb-2">Activity</h3>
        <p className="text-sm text-muted-foreground">No activity events yet.</p>
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col overflow-hidden p-4", className)}>
      <h3 className="font-medium text-sm mb-3 shrink-0">Activity</h3>
      <div className={cn("min-h-0 overflow-y-auto pe-1", maxHeightClassName)}>
        {grouped.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            <p className="sticky top-0 z-[1] bg-card/95 backdrop-blur-sm py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
            <ol className="relative border-s border-border ms-2 space-y-0 mt-1">
              {group.items.map((item) => (
                <li key={item.id} className="ms-4 pb-5 last:pb-0">
                  <span className="absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full border bg-background border-primary" />
                  <time className="text-xs text-muted-foreground block" dateTime={item.at}>
                    {timeOnlyLabel(item.at)}
                  </time>
                  <p
                    className={`text-sm font-medium ${
                      item.tone === "success"
                        ? "text-emerald-700 dark:text-emerald-400"
                        : item.tone === "warning"
                          ? "text-amber-700 dark:text-amber-400"
                          : ""
                    }`}
                  >
                    {item.title}
                  </p>
                  {item.detail ? (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </Card>
  );
}
