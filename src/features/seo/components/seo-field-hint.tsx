"use client";

import type { SeoFieldTone } from "@/features/seo/scoring/seo-scoring.service";
import { cn } from "@/lib/utils";

export type SeoFieldHintTone = SeoFieldTone | "warn";

type Props = {
  message: string;
  tone: SeoFieldHintTone;
  progress?: number;
  showCounter?: boolean;
  max?: number;
  length?: number;
};

const toneBarClass: Record<SeoFieldHintTone, string> = {
  empty: "bg-red-500",
  short: "bg-red-500",
  good: "bg-emerald-500",
  long: "bg-amber-500",
  warn: "bg-amber-500",
};

const toneTextClass: Record<SeoFieldHintTone, string> = {
  empty: "text-red-600 dark:text-red-400",
  short: "text-red-600 dark:text-red-400",
  good: "text-emerald-600 dark:text-emerald-400",
  long: "text-amber-700 dark:text-amber-400",
  warn: "text-amber-700 dark:text-amber-400",
};

const toneDotClass: Record<SeoFieldHintTone, string> = {
  empty: "bg-red-500",
  short: "bg-red-500",
  good: "bg-emerald-500",
  long: "bg-amber-500",
  warn: "bg-amber-500",
};

export function SeoFieldHint({ message, tone, progress, showCounter, max, length = 0 }: Props) {
  const showBar = progress !== undefined && max !== undefined;

  return (
    <div className="space-y-1.5">
      {showBar ? (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all duration-200", toneBarClass[tone])}
              style={{ width: `${Math.max(2, progress)}%` }}
            />
          </div>
          {showCounter ? (
            <span className={cn("shrink-0 text-xs tabular-nums", toneTextClass[tone])}>
              {length} / {max}
            </span>
          ) : null}
        </div>
      ) : null}
      <p className={cn("flex items-start gap-1.5 text-xs", toneTextClass[tone])}>
        {!showBar ? <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", toneDotClass[tone])} /> : null}
        <span>{message}</span>
      </p>
    </div>
  );
}

export function checkTone(passed: boolean, optional = false): SeoFieldHintTone {
  if (passed) return "good";
  return optional ? "warn" : "empty";
}
