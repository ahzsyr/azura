"use client";

import Link from "next/link";
import { helpHref } from "@/features/help/lib/help-href";
import { useChecklistProgress } from "@/features/help/hooks/use-checklist-progress";
import { helpRegistry } from "@/features/help/data/registry";
import type { HelpChecklist } from "@/features/help/types";
import { cn } from "@/lib/utils";

function HelpChecklistInner({
  checklist,
  className,
}: {
  checklist: HelpChecklist;
  className?: string;
}) {
  const { progress, checkedIds, toggle } = useChecklistProgress(checklist);
  const checked = new Set(checkedIds);

  return (
    <div className={cn("rounded-lg border p-4", className)} id={checklist.id}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-medium">{checklist.title}</h4>
        <span className="text-sm text-muted-foreground">
          {progress.percent}% complete ({progress.completed}/{progress.total})
        </span>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">{checklist.summary}</p>
      <ul className="space-y-2">
        {checklist.items.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <input
              id={item.id}
              type="checkbox"
              checked={checked.has(item.id)}
              onChange={() => toggle(item.id)}
              className="mt-1 h-4 w-4 rounded border-input"
            />
            <label htmlFor={item.id} className="flex-1 text-sm leading-snug">
              {item.label}
              {item.href && (
                <>
                  {" "}
                  <Link
                    href={helpHref(item.href)}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Open
                  </Link>
                </>
              )}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HelpChecklistView({
  checklistId,
  className,
}: {
  checklistId: string;
  className?: string;
}) {
  const checklist = helpRegistry.checklistsById.get(checklistId);
  if (!checklist) return null;
  return <HelpChecklistInner checklist={checklist} className={className} />;
}
