"use client";

import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import { pickLocaleArrayField } from "@/features/builder/blocks/content/lib/locale-field";
import type { comparisonColumnSchema, comparisonRowSchema } from "@/features/builder/blocks/content/schemas/content-blocks";
import type { z } from "zod";

type Column = z.infer<typeof comparisonColumnSchema>;
type Row = z.infer<typeof comparisonRowSchema>;

type Props = {
  title?: string;
  columns: Column[];
  rows: Row[];
  layout: "table" | "cards" | "sideBySide";
  highlightDifferences: boolean;
  locale: Locale;
};

function formatValue(value: string | boolean | undefined): string {
  if (typeof value === "boolean") return value ? "✓" : "—";
  return value?.trim() ? value : "—";
}

function rowDiffers(row: Row, columnIds: string[]): boolean {
  const vals = columnIds.map((id) => formatValue(row.values[id]).toLowerCase()).filter((v) => v !== "—");
  if (vals.length < 2) return false;
  return vals.some((v) => v !== vals[0]);
}

export function ManualComparisonView({
  title,
  columns,
  rows,
  layout,
  highlightDifferences,
  locale,
}: Props) {
  if (columns.length === 0 || rows.length === 0) return null;

  const colLabels = columns.map((c) => ({
    ...c,
    label: pickLocaleArrayField(c, "label", locale) || c.id,
  }));

  if (layout === "cards") {
    return (
      <div className="cb-comparison cb-comparison--cards">
        {title && <h2 className="font-heading text-2xl font-bold mb-6">{title}</h2>}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {colLabels.map((col) => (
            <div
              key={col.id}
              className={cn(
                "rounded-xl border p-5",
                col.highlighted && "border-primary ring-1 ring-primary/20"
              )}
            >
              <h3 className="font-semibold text-lg mb-4">{col.label}</h3>
              <dl className="space-y-3 text-sm">
                {rows.map((row) => {
                  const rowLabel = pickLocaleArrayField(row, "label", locale);
                  const differs = highlightDifferences && rowDiffers(row, columns.map((c) => c.id));
                  return (
                    <div
                      key={row.id}
                      className={cn(differs && "rounded bg-amber-50 dark:bg-amber-950/20 px-2 -mx-2 py-1")}
                    >
                      <dt className="text-muted-foreground">{rowLabel}</dt>
                      <dd className="font-medium">{formatValue(row.values[col.id])}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="cb-comparison cb-comparison--table">
      {title && <h2 className="font-heading text-2xl font-bold mb-6">{title}</h2>}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th scope="col" className="text-start px-4 py-3 font-medium" />
              {colLabels.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={cn(
                    "text-start px-4 py-3 font-medium",
                    col.highlighted && "bg-primary/5 text-primary"
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowLabel = pickLocaleArrayField(row, "label", locale);
              const differs = highlightDifferences && rowDiffers(row, columns.map((c) => c.id));
              return (
                <tr key={row.id} className={cn("border-t", differs && "bg-amber-50/50 dark:bg-amber-950/10")}>
                  <th scope="row" className="text-start px-4 py-3 font-medium text-muted-foreground">
                    {rowLabel}
                  </th>
                  {colLabels.map((col) => (
                    <td key={col.id} className="px-4 py-3">
                      {formatValue(row.values[col.id])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
