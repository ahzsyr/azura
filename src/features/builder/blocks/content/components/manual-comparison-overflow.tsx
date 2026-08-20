"use client";

import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import { pickLocaleArrayField } from "@/features/builder/blocks/content/lib/locale-field";
import type { comparisonColumnSchema, comparisonRowSchema } from "@/features/builder/blocks/content/schemas/content-blocks";
import type { z } from "zod";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { MarketingItemsOverflow } from "@/features/builder/components/marketing-items-overflow";

type Column = z.infer<typeof comparisonColumnSchema>;
type Row = z.infer<typeof comparisonRowSchema>;

function formatValue(value: string | boolean | undefined): string {
  if (typeof value === "boolean") return value ? "✓" : "—";
  return value?.trim() ? value : "—";
}

function rowDiffers(row: Row, columnIds: string[]): boolean {
  const vals = columnIds.map((id) => formatValue(row.values[id]).toLowerCase()).filter((v) => v !== "—");
  if (vals.length < 2) return false;
  return vals.some((v) => v !== vals[0]);
}

type Props = {
  title?: string;
  columns: Column[];
  rows: Row[];
  highlightDifferences: boolean;
  locale: Locale;
  block: BlockNode;
  overflow: BlockOverflowContext;
};

export function ManualComparisonOverflow({
  title,
  columns,
  rows,
  highlightDifferences,
  locale,
  block,
  overflow,
}: Props) {
  const colLabels = columns.map((c) => ({
    ...c,
    label: pickLocaleArrayField(c, "label", locale) || c.id,
  }));

  return (
    <div className="cb-comparison cb-comparison--cards">
      {title && <h2 className="font-heading text-2xl font-bold mb-6">{title}</h2>}
      <MarketingItemsOverflow
        block={block}
        overflowFlags={overflow.flags}
        previewDevice={overflow.previewDevice}
        items={colLabels}
        columns={Math.min(columns.length, 4) as 2 | 3 | 4}
        useSimpleSliderTrack={false}
        gridClassName="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        getItemKey={(col) => col.id}
        renderItem={(col) => (
          <div
            className={cn(
              "rounded-xl border p-5 min-w-[240px]",
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
        )}
        accordionRender={(col) => ({
          title: col.label,
          body: (
            <dl className="space-y-2 text-sm">
              {rows.map((row) => (
                <div key={row.id}>
                  <span className="text-muted-foreground">{pickLocaleArrayField(row, "label", locale)}: </span>
                  <span className="font-medium">{formatValue(row.values[col.id])}</span>
                </div>
              ))}
            </dl>
          ),
        })}
      />
    </div>
  );
}
