"use client";

import Link from "next/link";
import { helpRegistry } from "@/features/help/data/registry";
import { helpHref } from "@/features/help/lib/help-href";
import type { HelpWorkflow } from "@/features/help/types";

export function HelpRelatedTasks({
  workflowIds,
  onOpenTopic,
}: {
  workflowIds?: string[];
  onOpenTopic?: (topicId: string) => void;
}) {
  if (!workflowIds?.length) return null;

  const workflows = workflowIds
    .map((id) => helpRegistry.workflowsById.get(id))
    .filter((w): w is HelpWorkflow => Boolean(w));

  if (!workflows.length) return null;

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Related tasks</h4>
      {workflows.map((workflow) => (
        <ol key={workflow.id} className="space-y-0">
          {workflow.steps.map((step, index) => (
            <li key={step.id} className="flex flex-col items-start">
              <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <span className="font-medium">{step.label}</span>
                {step.type === "topic" && (
                  <button
                    type="button"
                    className="text-primary underline-offset-2 hover:underline"
                    onClick={() => onOpenTopic?.(step.topicId)}
                  >
                    Open
                  </button>
                )}
                {step.type === "route" && (
                  <Link
                    href={helpHref(step.href)}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Open
                  </Link>
                )}
                {step.type === "checklist" && (
                  <a
                    href={`#${step.checklistId}`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Checklist
                  </a>
                )}
              </div>
              {index < workflow.steps.length - 1 && (
                <span className="ms-5 py-1 text-muted-foreground" aria-hidden>
                  ↓
                </span>
              )}
            </li>
          ))}
        </ol>
      ))}
    </div>
  );
}
