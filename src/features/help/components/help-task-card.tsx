"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatReadingTime } from "@/features/help/lib/format-reading-time";
import { helpHref } from "@/features/help/lib/help-href";
import type { HelpTopicStatus } from "@/features/help/lib/topic-status";
import type { HelpDifficulty } from "@/features/help/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<HelpTopicStatus, string> = {
  new: "New",
  in_progress: "In Progress",
  completed: "Completed",
  recommended: "Recommended",
};

const STATUS_CLASS: Record<HelpTopicStatus, string> = {
  new: "text-muted-foreground",
  in_progress: "border-sky-500/40 text-sky-700 dark:text-sky-300",
  completed: "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
  recommended: "border-amber-500/40 text-amber-700 dark:text-amber-300",
};

export function HelpTaskCard({
  id,
  title,
  summary,
  readingTime,
  difficulty,
  status,
  primaryHref,
  primaryLabel,
  highlighted,
  onViewGuide,
  className,
}: {
  id: string;
  title: string;
  summary: string;
  readingTime?: number;
  difficulty?: HelpDifficulty;
  status?: HelpTopicStatus;
  primaryHref?: string;
  primaryLabel?: string;
  highlighted?: boolean;
  onViewGuide?: () => void;
  className?: string;
}) {
  return (
    <Card
      id={`topic-card-${id}`}
      tabIndex={0}
      data-topic-id={id}
      className={cn(
        "scroll-mt-24 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring",
        highlighted && "ring-2 ring-primary",
        className
      )}
      onKeyDown={(e) => {
        if (e.key === "Enter" && onViewGuide) {
          e.preventDefault();
          onViewGuide();
        }
      }}
    >
      <CardHeader className="space-y-2 pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{title}</CardTitle>
          {typeof readingTime === "number" && (
            <span className="text-xs text-muted-foreground">{formatReadingTime(readingTime)}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {difficulty && (
            <Badge variant="outline" className="capitalize text-muted-foreground">
              {difficulty}
            </Badge>
          )}
          {status && (
            <Badge variant="outline" className={STATUS_CLASS[status]}>
              {status === "completed" ? "✓ " : ""}
              {STATUS_LABEL[status]}
            </Badge>
          )}
        </div>
        <CardDescription className="line-clamp-2">{summary}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {onViewGuide && (
          <Button type="button" size="sm" variant="secondary" onClick={onViewGuide}>
            View Guide
          </Button>
        )}
        {primaryHref && (
          <Button asChild size="sm">
            <Link href={helpHref(primaryHref, id)}>{primaryLabel ?? "Open"}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
