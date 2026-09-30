"use client";

import { useState } from "react";
import type { DataSourceClientMeta } from "@/features/data-platform/types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(value: unknown): string {
  if (value === null || value === undefined) return "—";
  try {
    const d = new Date(value as string | number | Date);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function isDateKey(key: string): boolean {
  return (
    key.endsWith("At") ||
    key.endsWith("Date") ||
    key === "scheduledAt" ||
    key === "publishedAt" ||
    key === "archivedAt" ||
    key === "deletedAt"
  );
}

function isFkKey(key: string): boolean {
  return key !== "id" && key.endsWith("Id");
}

// ---------------------------------------------------------------------------
// Single field row
// ---------------------------------------------------------------------------

function FieldRow({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  const [expanded, setExpanded] = useState(false);

  const labelCell = (
    <td className="py-1.5 pe-4 text-muted-foreground text-xs font-medium whitespace-nowrap align-top w-32 min-w-28">
      {fieldKey}
    </td>
  );

  if (value === null || value === undefined) {
    return (
      <tr>
        {labelCell}
        <td className="py-1.5 text-xs text-muted-foreground/60">—</td>
      </tr>
    );
  }

  // Date fields
  if (isDateKey(fieldKey)) {
    return (
      <tr>
        {labelCell}
        <td className="py-1.5 text-xs text-muted-foreground">{formatDate(value)}</td>
      </tr>
    );
  }

  // Primary ID
  if (fieldKey === "id") {
    return (
      <tr>
        {labelCell}
        <td className="py-1.5">
          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
            {String(value)}
          </code>
        </td>
      </tr>
    );
  }

  // FK ids (ends in "Id")
  if (isFkKey(fieldKey) && typeof value === "string") {
    return (
      <tr>
        {labelCell}
        <td className="py-1.5">
          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
            {value}
          </code>
        </td>
      </tr>
    );
  }

  // Boolean
  if (typeof value === "boolean") {
    return (
      <tr>
        {labelCell}
        <td className="py-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              value
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            {value ? "Yes" : "No"}
          </span>
        </td>
      </tr>
    );
  }

  // Number
  if (typeof value === "number") {
    return (
      <tr>
        {labelCell}
        <td className="py-1.5 font-mono text-sm">{value}</td>
      </tr>
    );
  }

  // Array (relation count / list)
  if (Array.isArray(value)) {
    return (
      <tr>
        {labelCell}
        <td className="py-1.5 text-xs text-muted-foreground">{value.length} items</td>
      </tr>
    );
  }

  // Object (nested relation)
  if (typeof value === "object") {
    const keys = Object.keys(value as object);
    return (
      <tr>
        {labelCell}
        <td className="py-1.5">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            <span className="opacity-60">{expanded ? "▼" : "▶"}</span>
            <span className="text-muted-foreground">
              {keys.slice(0, 4).join(", ")}
              {keys.length > 4 ? ` +${keys.length - 4}` : ""}
            </span>
          </button>
          {expanded && (
            <pre className="mt-2 text-xs font-mono bg-muted rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap break-all">
              {JSON.stringify(value, null, 2)}
            </pre>
          )}
        </td>
      </tr>
    );
  }

  // Long string → truncate
  const str = String(value);
  if (str.length > 200) {
    return (
      <tr>
        {labelCell}
        <td className="py-1.5 text-sm">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary hover:underline block mb-1"
          >
            {expanded ? "▼ Collapse" : `▶ Expand (${str.length} chars)`}
          </button>
          <span className={cn("text-xs", !expanded && "line-clamp-2 block")}>{str}</span>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      {labelCell}
      <td className="py-1.5 text-sm">{str}</td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// RecordInspector
// ---------------------------------------------------------------------------

type Props = {
  record: Record<string, unknown>;
  source?: DataSourceClientMeta;
};

export function RecordInspector({ record, source }: Props) {
  const [showRaw, setShowRaw] = useState(false);

  const title = (() => {
    for (const key of ["slug", "name", "email", "filename", "canonicalSlug", "pageSlug", "title"]) {
      const v = record[key];
      if (v != null && String(v).trim()) return String(v);
    }
    return String(record.id ?? source?.displayName ?? "Record");
  })();

  const subtitle = (() => {
    const parts = [record.status, record.mimeType, record.email, record.brand, record.segment]
      .filter((v) => v != null && String(v).trim())
      .map(String)
      .filter((p) => p !== title);
    return parts.length > 0 ? parts.join(" · ") : null;
  })();

  // Separate scalar/simple fields from heavy JSON blobs
  const entries = Object.entries(record);
  const scalarEntries = entries.filter(([, v]) => {
    if (v === null || v === undefined) return true;
    if (typeof v !== "object") return true;
    if (Array.isArray(v)) return true;
    // Keep nested objects but mark heavy blobs separately
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b pb-3">
        <p className="font-semibold text-sm leading-tight">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
        {record.id != null && (
          <code className="text-xs font-mono text-muted-foreground/70 mt-1 block">
            {String(record.id)}
          </code>
        )}
      </div>

      {/* Fields table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <tbody className="divide-y divide-border/40">
            {scalarEntries.map(([k, v]) => (
              <FieldRow key={k} fieldKey={k} value={v} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Raw JSON collapse */}
      <div className="border-t pt-3">
        <button
          type="button"
          onClick={() => setShowRaw(!showRaw)}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
        >
          <span className="opacity-60">{showRaw ? "▼" : "▶"}</span>
          Raw JSON
        </button>
        {showRaw && (
          <pre className="mt-2 text-xs font-mono bg-muted rounded-md p-3 max-h-72 overflow-auto whitespace-pre-wrap break-all">
            {JSON.stringify(record, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
