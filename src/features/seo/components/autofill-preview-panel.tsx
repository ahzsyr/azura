"use client";

import { useState, useTransition } from "react";
import type { SeoPreviewModel } from "@/features/seo/platform/types/autofill";
import type { SeoChangeSet } from "@/features/seo/platform/types/change-set";
import { commitAutoFillAction } from "@/features/seo/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  preview: SeoPreviewModel;
  changeSet: SeoChangeSet;
  entityType: string;
  entityId: string;
  locale: string;
  onApplied?: (payload: { changeSet: SeoChangeSet; selected: string[] }) => void;
  onCancel?: () => void;
};

export function AutoFillPreviewPanel({
  preview,
  changeSet,
  entityType,
  entityId,
  locale,
  onApplied,
  onCancel,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(preview.fields.filter((f) => f.changed).map((f) => f.field))
  );
  const [isPending, startTransition] = useTransition();

  function toggle(field: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }

  function handleApply() {
    const fieldSelection = [...selected];
    startTransition(async () => {
      await commitAutoFillAction({
        entityType,
        entityId,
        locale,
        changeSetJson: JSON.stringify(changeSet),
        fieldSelection,
      });
      onApplied?.({ changeSet, selected: fieldSelection });
    });
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Auto-fill preview</h3>
        {preview.score != null ? (
          <span className="text-xs text-muted-foreground">Score: {preview.score}/100</span>
        ) : null}
      </div>

      {preview.fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">No suggested changes.</p>
      ) : (
        <ul className="space-y-3">
          {preview.fields.map((field) => (
            <li key={field.field} className="rounded-md border bg-background p-3 text-sm">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selected.has(field.field)}
                  onChange={() => toggle(field.field)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium">{field.label}</p>
                  {field.current ? (
                    <p className="text-xs text-muted-foreground line-through">{field.current}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">(empty)</p>
                  )}
                  <p className={cn("text-xs", field.changed ? "text-foreground" : "text-muted-foreground")}>
                    → {field.suggested ?? "—"}
                  </p>
                  {field.message ? (
                    <p
                      className={cn(
                        "text-xs",
                        field.severity === "warn" ? "text-amber-600" : "text-muted-foreground"
                      )}
                    >
                      {field.message}
                    </p>
                  ) : null}
                </div>
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={handleApply} disabled={isPending || selected.size === 0}>
          {isPending ? "Applying…" : "Apply selected"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
