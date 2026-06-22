"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const API: RequestInit = { credentials: "include" };

const CHUNK_SIZE = 25;

type ImportSummary = {
  dryRun: boolean;
  aggregate: { created: number; updated: number; skipped: number; error: number; total: number };
  rows: Array<{
    slug: string;
    name: string;
    status: string;
    errors: string[];
    warnings: string[];
  }>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onDone?: (summary: ImportSummary) => void | Promise<void>;
};

async function parseCollectionFile(file: File): Promise<{ ok: boolean; error?: string; raw: unknown }> {
  try {
    const text = await file.text();
    const parsed: unknown = JSON.parse(text);
    return { ok: true, raw: parsed };
  } catch {
    return { ok: false, error: "Invalid JSON", raw: null };
  }
}

function extractKnownSlugs(items: unknown[]): string[] {
  return items
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const row = item as Record<string, unknown>;
      return String(row.slug ?? row.name ?? "").trim();
    })
    .filter(Boolean);
}

function extractCollections(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && "collections" in raw) {
    const list = (raw as { collections: unknown }).collections;
    if (Array.isArray(list)) return list;
    if (list && typeof list === "object" && list !== null && "collections" in list) {
      const nested = (list as { collections: unknown }).collections;
      if (Array.isArray(nested)) return nested;
    }
  }
  throw new Error("Expected { collections: [...] } or a collections array");
}

async function readImportApiResponse<T extends { error?: string }>(
  res: Response,
): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    const preview = text.slice(0, 240).trim();
    const lower = preview.toLowerCase();
    if (res.status === 504 || lower.includes("timeout") || lower.includes("timed out")) {
      throw new Error(
        "Import timed out on the server. Try Preview first, enable Replace all only if needed, or import a smaller file.",
      );
    }
    if (lower.startsWith("an error")) {
      throw new Error(
        "Server error during import (likely a timeout). Deploy the latest build, then retry Preview before Import.",
      );
    }
    throw new Error(preview || `Import request failed (HTTP ${res.status})`);
  }
}

export function CollectionBulkImportModal({ open, onClose, onDone }: Props) {
  const titleId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [replaceAll, setReplaceAll] = useState(false);
  const [duplicatePolicy, setDuplicatePolicy] = useState<"overwrite" | "skip" | "merge">("overwrite");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, label: "" });
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFile(null);
    setParseError(null);
    setSummary(null);
    setError(null);
    setProgress({ done: 0, total: 0, label: "" });
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (picked: File | null) => {
    setFile(picked);
    setParseError(null);
    setSummary(null);
    setError(null);
    if (!picked) return;
    const parsed = await parseCollectionFile(picked);
    if (!parsed.ok) setParseError(parsed.error ?? "Could not parse file");
  };

  const runImport = async (preview: boolean) => {
    if (!file) return;
    setImporting(true);
    setError(null);
    setSummary(null);
    setProgress({ done: 0, total: 0, label: "" });

    try {
      const parsed = await parseCollectionFile(file);
      if (!parsed.ok) throw new Error(parsed.error ?? "Invalid file");

      const items = extractCollections(parsed.raw);
      const totalItems = items.length;
      if (totalItems === 0) throw new Error("No collections found in file");
      const knownSlugs = extractKnownSlugs(items);

      const chunks: unknown[][] = [];
      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        chunks.push(items.slice(i, i + CHUNK_SIZE));
      }

      let created = 0;
      let updated = 0;
      let skipped = 0;
      let errCount = 0;
      const allRows: ImportSummary["rows"] = [];
      let processedItems = 0;

      setProgress({ done: 0, total: totalItems, label: preview ? "Previewing…" : "Importing…" });

      for (let c = 0; c < chunks.length; c++) {
        const chunk = chunks[c]!;
        const res = await fetch("/api/collections/import", {
          ...API,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collections: chunk,
            options: {
              dryRun: preview,
              replaceAll: replaceAll && c === 0,
              duplicatePolicy,
              syncLocales: !preview && c === chunks.length - 1,
              knownSlugs,
              clearExisting: replaceAll && c === 0,
              finalizeReplaceAll: replaceAll && c === chunks.length - 1,
            },
          }),
        });
        const data = await readImportApiResponse<ImportSummary & { error?: string }>(res);
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        if (data.aggregate.error > 0) {
          const message =
            data.rows.flatMap((row) => row.errors).find(Boolean) ??
            `Chunk ${c + 1} failed validation (${data.aggregate.error} errors)`;
          throw new Error(message);
        }

        created += data.aggregate.created;
        updated += data.aggregate.updated;
        skipped += data.aggregate.skipped;
        errCount += data.aggregate.error;
        allRows.push(...data.rows);

        processedItems = Math.min(processedItems + chunk.length, totalItems);
        setProgress({
          done: processedItems,
          total: totalItems,
          label: preview
            ? `Previewing ${processedItems} of ${totalItems}`
            : `Importing ${processedItems} of ${totalItems}`,
        });
      }

      const finalSummary: ImportSummary = {
        dryRun: preview,
        aggregate: {
          created,
          updated,
          skipped,
          error: errCount,
          total: totalItems,
        },
        rows: allRows,
      };
      setSummary(finalSummary);
      if (!preview) await onDone?.(finalSummary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
      setProgress({ done: 0, total: 0, label: "" });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl"
        role="dialog"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="text-lg font-semibold">
          Import collections
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a JSON file with <code className="text-xs">{`{ collections: [...] }`}</code> or a collections array.
        </p>

        <div className="mt-4 space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="block w-full text-sm"
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />
          {file && <p className="text-xs text-muted-foreground">Selected: {file.name}</p>}
          {parseError && <p className="text-sm text-destructive">{parseError}</p>}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={replaceAll} onChange={(e) => setReplaceAll(e.target.checked)} />
            Replace all existing collections (clear before import)
          </label>

          <label className="block text-sm">
            When slug exists
            <select
              className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              value={duplicatePolicy}
              onChange={(e) =>
                setDuplicatePolicy(e.target.value as "overwrite" | "skip" | "merge")
              }
            >
              <option value="overwrite">Overwrite</option>
              <option value="merge">Merge fields</option>
              <option value="skip">Skip</option>
            </select>
          </label>
        </div>

        {progress.total > 0 && (
          <div className="acp-op-progress mt-3" role="status" aria-live="polite">
            <div className="acp-op-progress__bar">
              <div
                className="acp-op-progress__fill"
                style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
              />
            </div>
            <p className="acp-op-progress__text">
              {progress.label} ({progress.done}/{progress.total})
            </p>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        {summary && (
          <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-sm">
            <p>
              {summary.dryRun ? "Preview" : "Import"}: {summary.aggregate.created} created,{" "}
              {summary.aggregate.updated} updated, {summary.aggregate.skipped} skipped,{" "}
              {summary.aggregate.error} errors
            </p>
            {summary.rows.some((r) => r.errors.length) && (
              <ul className="mt-2 max-h-32 overflow-auto text-xs text-destructive">
                {summary.rows
                  .filter((r) => r.errors.length)
                  .slice(0, 8)
                  .map((r) => (
                    <li key={`${r.slug}-${r.errors[0]}`}>
                      {r.slug || r.name}: {r.errors.join("; ")}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={importing}>
            Close
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!file || importing || !!parseError}
            onClick={() => void runImport(true)}
          >
            {importing ? "…" : "Preview"}
          </Button>
          <Button
            type="button"
            disabled={!file || importing || !!parseError}
            onClick={() => void runImport(false)}
          >
            {importing ? "Importing…" : "Import"}
          </Button>
        </div>
      </div>
    </div>
  );
}
