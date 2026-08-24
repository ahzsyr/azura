"use client";

import { useEffect, useMemo, useState } from "react";
import { getWorkflowAccent } from "@/features/help/lib/quick-action-accents";
import { getWorkflowChecklistProgress } from "@/features/help/lib/topic-status";
import type { HelpChecklistProgress, HelpWorkflow } from "@/features/help/types";
import { cn } from "@/lib/utils";

function useWorkflowProgressMap(workflows: HelpWorkflow[]) {
  const [map, setMap] = useState<Record<string, HelpChecklistProgress | null>>({});

  useEffect(() => {
    const refresh = () => {
      const next: Record<string, HelpChecklistProgress | null> = {};
      for (const workflow of workflows) {
        next[workflow.id] = getWorkflowChecklistProgress(workflow);
      }
      setMap(next);
    };
    refresh();
    window.addEventListener("help-checklist-updated", refresh);
    return () => window.removeEventListener("help-checklist-updated", refresh);
  }, [workflows]);

  return map;
}

export function HelpQuickActions({
  workflows,
  onOpenWorkflow,
}: {
  workflows: HelpWorkflow[];
  onOpenWorkflow: (workflow: HelpWorkflow) => void;
}) {
  const tiles = useMemo(() => workflows.slice(0, 8), [workflows]);
  const progressMap = useWorkflowProgressMap(tiles);

  if (!tiles.length) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium">Quick Actions</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((workflow) => {
          const accent = getWorkflowAccent(workflow.id);
          const Icon = accent.icon;
          const progress = progressMap[workflow.id];
          const inProgress = progress && progress.percent > 0 && progress.percent < 100;
          const completed = progress && progress.percent === 100;

          return (
            <button
              key={workflow.id}
              type="button"
              onClick={() => onOpenWorkflow(workflow)}
              className={cn(
                "flex flex-col gap-2 rounded-xl border p-4 text-start transition-colors",
                accent.tileClass
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn("h-5 w-5", accent.iconClass)} />
                <span className="text-sm font-medium leading-snug">{workflow.title}</span>
              </div>
              {inProgress && (
                <span className="text-xs font-medium text-muted-foreground">
                  {progress.percent}% · Continue
                </span>
              )}
              {completed && (
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  Completed
                </span>
              )}
              {!progress && (
                <span className="text-xs text-muted-foreground line-clamp-2">{workflow.summary}</span>
              )}
              {progress && progress.percent === 0 && (
                <span className="text-xs text-muted-foreground line-clamp-2">{workflow.summary}</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
