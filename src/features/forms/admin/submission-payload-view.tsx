"use client";

import { SubmissionFieldValue } from "@/features/forms/admin/submission-field-value";
import { getPayloadRecord } from "@/features/forms/lib/submission-contact";
import type { FormFieldDefinition, FormStepDefinition } from "@/features/forms/types";
import { cn } from "@/lib/utils";

const HIDDEN_KEYS = new Set(["honeypot", "_honeypot", "csrf", "captcha"]);

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type FieldGroup = {
  id: string;
  title: string | null;
  keys: string[];
};

function buildGroups(
  orderedKeys: string[],
  fields: FormFieldDefinition[] | null | undefined,
  steps?: FormStepDefinition[] | null,
): FieldGroup[] {
  const fieldById = new Map((fields ?? []).map((f) => [f.id, f]));
  const extended = fields as Array<FormFieldDefinition & { stepId?: string; section?: string; group?: string }> | undefined;

  const hasStepGrouping = Boolean(steps && steps.length > 0);
  const hasFieldGrouping = (extended ?? []).some(
    (f) => f.stepId || f.section || f.group,
  );

  if (!hasStepGrouping && !hasFieldGrouping) {
    return [{ id: "all", title: null, keys: orderedKeys }];
  }

  const groups: FieldGroup[] = [];
  const assigned = new Set<string>();

  if (hasStepGrouping && steps) {
    for (const step of steps) {
      const keys = step.fieldIds.filter((id) => orderedKeys.includes(id));
      if (keys.length === 0) continue;
      groups.push({ id: step.id, title: step.title, keys });
      for (const k of keys) assigned.add(k);
    }
  } else if (extended) {
    const sectionOrder: string[] = [];
    const sectionMap = new Map<string, string[]>();
    for (const key of orderedKeys) {
      const field = extended.find((f) => f.id === key);
      if (!field) continue;
      const sectionKey = field.section || field.group || field.stepId;
      if (!sectionKey) continue;
      if (!sectionMap.has(sectionKey)) {
        sectionMap.set(sectionKey, []);
        sectionOrder.push(sectionKey);
      }
      sectionMap.get(sectionKey)!.push(key);
      assigned.add(key);
    }
    for (const sectionKey of sectionOrder) {
      groups.push({
        id: sectionKey,
        title: humanizeKey(sectionKey),
        keys: sectionMap.get(sectionKey) ?? [],
      });
    }
  }

  const remaining = orderedKeys.filter((k) => !assigned.has(k));
  if (remaining.length > 0) {
    groups.push({
      id: "other",
      title: groups.length > 0 ? "Other" : null,
      keys: remaining,
    });
  }

  // Ensure we didn't drop fields that weren't in field defs
  void fieldById;
  return groups.length > 0 ? groups : [{ id: "all", title: null, keys: orderedKeys }];
}

export function SubmissionPayloadView({
  payload,
  fields,
  steps,
  className,
}: {
  payload: unknown;
  fields?: FormFieldDefinition[] | null;
  steps?: FormStepDefinition[] | null;
  className?: string;
}) {
  const data = getPayloadRecord(payload);
  const fieldById = new Map((fields ?? []).map((f) => [f.id, f]));

  const entries = Object.entries(data).filter(([key]) => !HIDDEN_KEYS.has(key.toLowerCase()));

  if (entries.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>No submission data.</p>
    );
  }

  const orderedKeys: string[] = [];
  const seen = new Set<string>();
  for (const field of fields ?? []) {
    if (field.id in data && !HIDDEN_KEYS.has(field.id.toLowerCase())) {
      orderedKeys.push(field.id);
      seen.add(field.id);
    }
  }
  for (const [key] of entries) {
    if (!seen.has(key)) orderedKeys.push(key);
  }

  const groups = buildGroups(orderedKeys, fields, steps);

  return (
    <div className={cn("rounded-lg border bg-muted/20", className)}>
      {groups.map((group, groupIndex) => (
        <div key={group.id}>
          {group.title && (
            <div
              className={cn(
                "px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                groupIndex > 0 && "border-t",
              )}
            >
              {group.title}
            </div>
          )}
          <dl className="divide-y">
            {group.keys.map((key) => {
              const raw = data[key];
              const fieldDef = fieldById.get(key) ?? null;
              const label = fieldDef?.label || humanizeKey(key);

              return (
                <div
                  key={key}
                  className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr] sm:gap-4 sm:items-start"
                >
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {label}
                  </dt>
                  <dd>
                    <SubmissionFieldValue fieldKey={key} value={raw} fieldDef={fieldDef} />
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      ))}
    </div>
  );
}
