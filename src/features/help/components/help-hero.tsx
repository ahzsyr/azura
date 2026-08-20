"use client";

import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getWorkflowAccent } from "@/features/help/lib/quick-action-accents";
import { formatReadingTime } from "@/features/help/lib/format-reading-time";
import type { HelpChecklist, HelpChecklistProgress, HelpWorkflow } from "@/features/help/types";
import { cn } from "@/lib/utils";

export function HelpHero({
  query,
  onQueryChange,
  searchInputRef,
  continueSetup,
  onContinue,
  popularWorkflows,
  onOpenWorkflow,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  continueSetup: { checklist: HelpChecklist; progress: HelpChecklistProgress } | null;
  onContinue: () => void;
  popularWorkflows: HelpWorkflow[];
  onOpenWorkflow: (workflow: HelpWorkflow) => void;
}) {
  return (
    <div className="space-y-6 rounded-xl border bg-gradient-to-br from-muted/50 to-background p-6 md:p-8">
      <div className="space-y-2">
        <h1 className="admin-page-title text-2xl font-semibold tracking-tight md:text-3xl">
          Help Center
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Everything you need to configure, manage, and launch your website.
        </p>
      </div>

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search everything…"
          className="ps-9"
          aria-label="Search help center"
        />
      </div>

      {continueSetup && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Continue Setup
            </p>
            <p className="font-medium">{continueSetup.checklist.title}</p>
            <p className="text-sm text-muted-foreground">
              {continueSetup.progress.percent}% complete ({continueSetup.progress.completed}/
              {continueSetup.progress.total})
            </p>
          </div>
          <Button type="button" onClick={onContinue} className="gap-1">
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {popularWorkflows.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Popular Tasks</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {popularWorkflows.map((workflow) => {
              const accent = getWorkflowAccent(workflow.id);
              const Icon = accent.icon;
              return (
                <button
                  key={workflow.id}
                  type="button"
                  onClick={() => onOpenWorkflow(workflow)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border px-3 py-3 text-start transition-colors",
                    accent.tileClass
                  )}
                >
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", accent.iconClass)} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-snug">{workflow.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatReadingTime(workflow.readingTime)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
