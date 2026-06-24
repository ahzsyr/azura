"use client";

import { useCallback, useRef, useState } from "react";
import type { LocaleConfig } from "@prisma/client";
import type { TranslationStatus } from "@prisma/client";
import type { EditableTranslationRow } from "@/features/translation/translation-grid-types";
import {
  parseTranslationCellKey,
  translationCellKey,
} from "@/features/translation/translation-grid-types";
import { TranslationStatusBadge } from "./translation-status-badge";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

export type DirtyCell = {
  value: string;
  status: TranslationStatus;
  originalValue: string;
  originalStatus?: TranslationStatus;
  markedDelete?: boolean;
};

type Props = {
  rows: EditableTranslationRow[];
  localeColumns: LocaleConfig[];
  defaultLocaleCode: string;
  dirtyCells: Record<string, DirtyCell>;
  onCellChange: (key: string, patch: Partial<DirtyCell>) => void;
  cellFeedback: Record<string, "saved" | "error">;
  disabled?: boolean;
};

function truncateId(id: string, max = 10) {
  if (id.length <= max) return id;
  return `${id.slice(0, max)}…`;
}

export function TranslationsSpreadsheetGrid({
  rows,
  localeColumns,
  defaultLocaleCode,
  dirtyCells,
  onCellChange,
  cellFeedback,
  disabled,
}: Props) {
  const [expandedCell, setExpandedCell] = useState<string | null>(null);

  const getCellDisplay = useCallback(
    (row: EditableTranslationRow, localeCode: string) => {
      const key = translationCellKey(row.entityType, row.entityId, row.field, localeCode);
      const dirty = dirtyCells[key];
      const base = row.cells[localeCode];
      if (dirty?.markedDelete) {
        return { value: "", status: undefined as TranslationStatus | undefined, key, isDirty: true };
      }
      if (dirty) {
        return {
          value: dirty.value,
          status: dirty.status,
          key,
          isDirty: true,
        };
      }
      return {
        value: base?.value ?? "",
        status: base?.status,
        key,
        isDirty: false,
      };
    },
    [dirtyCells]
  );

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-12 text-center">
        No rows match the current filters. Try another entity type or search term.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm border-collapse min-w-[900px]">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="p-2 text-left font-medium sticky left-0 z-20 bg-muted/40 min-w-[120px]">
              Entity ID
            </th>
            <th className="p-2 text-left font-medium min-w-[100px]">Field</th>
            <th className="p-2 text-left font-medium min-w-[180px]">
              Source ({defaultLocaleCode.toUpperCase()})
            </th>
            {localeColumns.map((l) => (
              <th key={l.code} className="p-2 text-left font-medium min-w-[200px]">
                {l.flag} {l.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowKey = `${row.entityType}:${row.entityId}:${row.field}`;
            return (
              <tr key={rowKey} className="border-b border-muted/50 hover:bg-muted/20">
                <td
                  className="p-2 font-mono text-xs sticky left-0 z-10 bg-background"
                  title={row.entityId}
                >
                  {truncateId(row.entityId)}
                </td>
                <td className="p-2">
                  <span className="font-medium">{row.fieldLabel}</span>
                  <span className="block text-xs text-muted-foreground">{row.field}</span>
                </td>
                <td className="p-2 text-muted-foreground align-top">
                  <p className="line-clamp-3 text-xs">{row.sourceValue || "—"}</p>
                </td>
                {localeColumns.map((locale) => {
                  const display = getCellDisplay(row, locale.code);
                  const isExpanded = expandedCell === display.key;
                  const feedback = cellFeedback[display.key];

                  return (
                    <td key={locale.code} className="p-1 align-top">
                      <SpreadsheetCell
                        cellKey={display.key}
                        value={display.value}
                        status={display.status}
                        isDirty={display.isDirty}
                        isExpanded={isExpanded}
                        feedback={feedback}
                        disabled={disabled}
                        onExpand={() => setExpandedCell(isExpanded ? null : display.key)}
                        onChange={(patch) => onCellChange(display.key, patch)}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SpreadsheetCell({
  cellKey,
  value,
  status,
  isDirty,
  isExpanded,
  feedback,
  disabled,
  onExpand,
  onChange,
}: {
  cellKey: string;
  value: string;
  status?: TranslationStatus;
  isDirty: boolean;
  isExpanded: boolean;
  feedback?: "saved" | "error";
  disabled?: boolean;
  onExpand: () => void;
  onChange: (patch: Partial<DirtyCell>) => void;
}) {
  const parsed = parseTranslationCellKey(cellKey);
  const displayStatus = status ?? (value.trim() ? "DRAFT" : "missing");

  return (
    <div
      className={cn(
        "rounded-md border p-1.5 space-y-1 transition-colors",
        isDirty && "border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20",
        feedback === "saved" && "border-green-500/50",
        feedback === "error" && "border-destructive/50"
      )}
    >
      {isExpanded ? (
        <Textarea
          rows={3}
          value={value}
          disabled={disabled}
          className="text-xs min-h-[72px] resize-y"
          onChange={(e) =>
            onChange({
              value: e.target.value,
              status: status ?? "PUBLISHED",
            })
          }
          onBlur={onExpand}
          autoFocus
        />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={onExpand}
          className="w-full text-start text-xs min-h-[2.5rem] px-1 py-0.5 rounded hover:bg-muted/60 line-clamp-3"
          title={value || "Click to edit"}
        >
          {value || <span className="text-muted-foreground italic">Empty — click to add</span>}
        </button>
      )}
      <div className="flex items-center justify-between gap-1">
        <TranslationStatusBadge
          status={displayStatus as TranslationStatus | "missing"}
          className="scale-90 origin-left"
        />
        <select
          value={status ?? "PUBLISHED"}
          disabled={disabled}
          className="h-6 w-[90px] text-[10px] px-1 border rounded bg-background"
          onChange={(e) =>
            onChange({
              value,
              status: e.target.value as TranslationStatus,
            })
          }
        >
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="REVIEW">Review</option>
        </select>
      </div>
      {parsed ? (
        <button
          type="button"
          disabled={disabled}
          className="text-[10px] text-muted-foreground hover:text-destructive"
          onClick={() =>
            onChange({
              value: "",
              status: status ?? "PUBLISHED",
              markedDelete: true,
            })
          }
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
