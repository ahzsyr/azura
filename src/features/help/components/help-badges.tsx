"use client";

import { Badge } from "@/components/ui/badge";
import type { HelpBadge, HelpDifficulty } from "@/features/help/types";
import { cn } from "@/lib/utils";

const BADGE_LABEL: Record<HelpBadge, string> = {
  recommended: "Recommended",
  required: "Required",
  advanced: "Advanced",
  "launch-required": "Launch Required",
};

const BADGE_CLASS: Record<HelpBadge, string> = {
  recommended: "border-amber-500/40 text-amber-700 dark:text-amber-300",
  required: "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
  advanced: "border-orange-500/40 text-orange-700 dark:text-orange-300",
  "launch-required": "border-sky-500/40 text-sky-700 dark:text-sky-300",
};

export function HelpBadges({
  badges,
  difficulty,
  className,
}: {
  badges?: HelpBadge[];
  difficulty?: HelpDifficulty;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {difficulty && (
        <Badge variant="outline" className="capitalize text-muted-foreground">
          {difficulty}
        </Badge>
      )}
      {(badges ?? []).map((badge) => (
        <Badge key={badge} variant="outline" className={BADGE_CLASS[badge]}>
          {BADGE_LABEL[badge]}
        </Badge>
      ))}
    </div>
  );
}
