"use client";

import { cn } from "@/lib/utils";
import { focusFieldById } from "./FocusManager";

export type ErrorSummaryItem = {
  id: string;
  label: string;
  message: string;
};

export function ErrorSummary({
  title = "Please fix the following:",
  items,
  className,
}: {
  title?: string;
  items: ErrorSummaryItem[];
  className?: string;
}) {
  if (!items.length) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "rounded-[var(--schema-radius-md)] border border-destructive/40 bg-destructive/5 p-4 text-sm",
        className,
      )}
    >
      <p className="font-medium text-destructive">{title}</p>
      <ul className="mt-2 list-disc space-y-1 ps-5">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="text-left text-destructive underline-offset-2 hover:underline"
              onClick={() => focusFieldById(item.id)}
            >
              <span className="font-medium">{item.label}</span>
              {item.message ? ` — ${item.message}` : ""}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function errorsToSummaryItems(
  errors: Record<string, string>,
  labels?: Record<string, string>,
): ErrorSummaryItem[] {
  return Object.entries(errors).map(([id, message]) => ({
    id,
    label: labels?.[id] ?? id,
    message,
  }));
}
