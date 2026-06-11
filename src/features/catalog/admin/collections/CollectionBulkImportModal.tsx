"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const API: RequestInit = { credentials: "include" };

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

export function CollectionBulkImportModal({ open, onClose, onDone }: Props) {
  const titleId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [replaceAll, setReplaceAll] = useState(false);
  const [duplicatePolicy, setDuplicatePolicy] = useState<"overwrite" | "skip" | "merge">("overwrite");
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFile(null);
    setParseError(null);
    setSummary(null);
    setError(null);
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
    try {
      const parsed = await parseCollectionFile(file);
      if (!parsed.ok) throw new Error(parsed.error ?? "Invalid file");

      const payload =
        parsed.raw && typeof parsed.raw === "object" && !Array.isArray(parsed.raw)
          ? { ...(parsed.raw as Record<string, unknown>) }
          : { collections: parsed.raw };

      const res = await fetch("/api/collections/import", {
        ...API,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          options: {
            dryRun: preview,
            replaceAll,
            duplicatePolicy,
            syncLocales: !preview,
          },
        }),
      });
      const data = (await res.json()) as ImportSummary & { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setSummary(data);
      if (!preview) await onDone?.(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
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
