import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

const API: RequestInit = { credentials: "include" };

export type CatalogLocaleOption = {
  code: string;
  label: string;
  urlPrefix: string;
};

const CHUNK_SIZE = 15;

export type BulkImportSummary = {
  importRunId: string;
  aggregate: { ok: number; skipped: number; error: number; total: number };
  /** Flattened row results from all chunks */
  rows: Array<{
    sourceFile?: string;
    slug: string;
    status: string;
    errors: string[];
    warnings: string[];
    localesWritten?: string[];
    collectionSync?: {
      matchedCollections: { slug: string; name: string }[];
      isOrphan: boolean;
      warnings: { code: string; message: string; context?: Record<string, unknown> }[];
    } | null;
  }>;
};

type ParsedFile = {
  file: File;
  ok: boolean;
  error?: string;
  products: unknown[];
  count: number;
};

type ImportSettings = {
  dryRun: boolean;
  importToAllLocales: boolean;
  selectedLocales: string[];
  autoGenerateStubs: boolean;
  localizedOverwrite: boolean;
  onlyMissingLocales: boolean;
  duplicatePolicy: "overwrite" | "skip";
  slugConflict: "error" | "suffix" | "skip";
  skipCollectionSync: boolean;
};

const defaultSettings = (): ImportSettings => ({
  dryRun: false,
  importToAllLocales: true,
  selectedLocales: [],
  autoGenerateStubs: true,
  localizedOverwrite: false,
  onlyMissingLocales: true,
  duplicatePolicy: "overwrite",
  slugConflict: "suffix",
  skipCollectionSync: true,
});

async function parseProductFile(file: File): Promise<ParsedFile> {
  try {
    const text = await file.text();
    const parsed: unknown = JSON.parse(text);
    const rawList = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === "object" &&
          "products" in parsed &&
          Array.isArray((parsed as { products: unknown }).products)
        ? (parsed as { products: unknown[] }).products
        : [parsed];
    if (!rawList.length || !rawList.every((x) => x && typeof x === "object")) {
      return { file, ok: false, error: "Expected a product object, { products: [...] }, or an array", products: [], count: 0 };
    }
    return { file, ok: true, products: rawList, count: rawList.length };
  } catch {
    return { file, ok: false, error: "Invalid JSON", products: [], count: 0 };
  }
}

type ProductBulkImportModalProps = {
  open: boolean;
  onClose: () => void;
  catalogLocales: CatalogLocaleOption[];
  adminLocaleCode: string;
  onDone?: (summary: BulkImportSummary, dryRun: boolean) => void | Promise<void>;
};

export function ProductBulkImportModal({
  open,
  onClose,
  catalogLocales,
  adminLocaleCode,
  onDone,
}: ProductBulkImportModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const prevActive = useRef<HTMLElement | null>(null);

  const [dragOver, setDragOver] = useState(false);
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [settings, setSettings] = useState<ImportSettings>(defaultSettings);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, label: "" });
  const [summary, setSummary] = useState<BulkImportSummary | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const effectiveTargetLocales = useMemo(() => {
    if (settings.importToAllLocales) return "all" as const;
    const sel = settings.selectedLocales.map((c) => c.toLowerCase());
    const admin = adminLocaleCode.toLowerCase();
    const withAdmin = sel.includes(admin) ? sel : [...sel, admin];
    return [...new Set(withAdmin)];
  }, [settings.importToAllLocales, settings.selectedLocales, adminLocaleCode]);

  useEffect(() => {
    if (!open) return;
    prevActive.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  const reset = useCallback(() => {
    setParsedFiles([]);
    setSettings(defaultSettings());
    setProgress({ done: 0, total: 0, label: "" });
    setSummary(null);
    setFatalError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (busy) return;
    reset();
    onClose();
    prevActive.current?.focus?.();
  }, [busy, onClose, reset]);

  const ingestFiles = useCallback(async (list: File[]) => {
    const jsonFiles = list.filter((f) => f.name.toLowerCase().endsWith(".json") || f.type === "application/json" || f.type === "");
    const parsed = await Promise.all(jsonFiles.map((f) => parseProductFile(f)));
    setParsedFiles(parsed);
    setSummary(null);
    setFatalError(null);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (busy) return;
      const files = [...e.dataTransfer.files];
      void ingestFiles(files);
    },
    [busy, ingestFiles],
  );

  const totalProducts = useMemo(() => parsedFiles.filter((p) => p.ok).reduce((a, p) => a + p.count, 0), [parsedFiles]);

  const runImport = useCallback(async () => {
    if (!parsedFiles.length || totalProducts === 0) return;
    setBusy(true);
    setFatalError(null);
    setSummary(null);

    const items: { sourceFile: string; product: unknown }[] = [];
    for (const pf of parsedFiles) {
      if (!pf.ok) continue;
      for (const product of pf.products) {
        items.push({ sourceFile: pf.file.name, product });
      }
    }

    const importRunId = `import-${Date.now()}`;
    const allRows: BulkImportSummary["rows"] = [];
    let ok = 0;
    let skipped = 0;
    let err = 0;

    const chunks: { sourceFile: string; product: unknown }[][] = [];
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      chunks.push(items.slice(i, i + CHUNK_SIZE));
    }

    setProgress({ done: 0, total: chunks.length, label: "Uploading…" });

    try {
      for (let c = 0; c < chunks.length; c++) {
        const chunk = chunks[c]!;
        const body = {
          importRunId,
          dryRun: settings.dryRun,
          sourceLocale: adminLocaleCode,
          targetLocales: effectiveTargetLocales,
          duplicatePolicy: settings.duplicatePolicy,
          localizedOverwrite: settings.localizedOverwrite,
          onlyMissingLocales: settings.onlyMissingLocales,
          autoGenerateStubs: settings.autoGenerateStubs,
          slugConflict: settings.slugConflict,
          skipCollectionSync: settings.skipCollectionSync,
          items: chunk,
        };

        const res = await fetch("/api/products/import", {
          ...API,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json()) as {
          error?: string;
          summary?: { ok: number; skipped: number; error: number; total: number };
          results?: BulkImportSummary["rows"];
        };
        if (!res.ok) throw new Error(json.error || "Import request failed");

        const summaryPart = json.summary;
        const resultsPart = json.results ?? [];
        if (summaryPart) {
          ok += summaryPart.ok;
          skipped += summaryPart.skipped;
          err += summaryPart.error;
        }
        allRows.push(...resultsPart);
        setProgress({ done: c + 1, total: chunks.length, label: `Chunk ${c + 1} / ${chunks.length}` });
      }

      const finalSummary: BulkImportSummary = {
        importRunId,
        aggregate: { ok, skipped, error: err, total: ok + skipped + err },
        rows: allRows,
      };
      setSummary(finalSummary);
      await onDone?.(finalSummary, settings.dryRun);
    } catch (e) {
      setFatalError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
      setProgress({ done: 0, total: 0, label: "" });
    }
  }, [
    parsedFiles,
    totalProducts,
    adminLocaleCode,
    effectiveTargetLocales,
    settings,
    onDone,
  ]);

  if (!open) return null;

  return (
    <div className="pm-import-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && !busy && handleClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="pm-import-dialog"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="pm-import-dialog__head">
          <h2 id={titleId} className="pm-import-dialog__title">
            Import products (JSON)
          </h2>
          <button type="button" className="pm-import-dialog__close" onClick={handleClose} disabled={busy} aria-label="Close">
            ×
          </button>
        </header>

        <div className="pm-import-dialog__body">
          <p className="pm-hint">
            Drop one or more JSON files, or browse. Each file may be a single product, an array, or <code>{"{ products: [...] }"}</code>.
            Invalid files are skipped; valid products import in queued chunks.
          </p>

          <div
            className={`pm-import-dropzone${dragOver ? " pm-import-dropzone--active" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <input
              type="file"
              accept="application/json,.json"
              multiple
              id="pm-import-multi"
              className="pm-import-dropzone__input"
              disabled={busy}
              onChange={(e) => {
                const input = e.target as HTMLInputElement;
                const files = [...(input.files ?? [])];
                input.value = "";
                void ingestFiles(files);
              }}
            />
            <label htmlFor="pm-import-multi" className="pm-import-dropzone__label">
              <span className="pm-import-dropzone__strong">Choose JSON files</span>
              <span className="pm-import-dropzone__sub">or drag and drop here</span>
            </label>
          </div>

          {parsedFiles.length > 0 && (
            <div className="pm-import-preview">
              <h3 className="pm-import-preview__title">File validation</h3>
              <table className="pm-import-preview__table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Products</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedFiles.map((pf) => (
                    <tr key={pf.file.name} className={pf.ok ? "" : "pm-import-preview__row--err"}>
                      <td><code>{pf.file.name}</code></td>
                      <td>{pf.ok ? pf.count : "—"}</td>
                      <td>{pf.ok ? "OK" : pf.error ?? "Error"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <fieldset className="pm-import-settings" disabled={busy}>
            <legend className="pm-import-settings__legend">Import options</legend>

            <label className="pm-import-check">
              <input
                type="checkbox"
                checked={settings.dryRun}
                onChange={(e) => setSettings((s) => ({ ...s, dryRun: e.target.checked }))}
              />
              Dry run (validate only, no writes)
            </label>

            <label className="pm-import-check">
              <input
                type="checkbox"
                checked={settings.importToAllLocales}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, importToAllLocales: e.target.checked }))
                }
              />
              Import to all configured locales
            </label>

            {!settings.importToAllLocales && (
              <div className="pm-import-locales">
                <span className="pm-import-locales__label">Locales</span>
                <div className="pm-import-locales__grid">
                  {catalogLocales.map((loc) => (
                    <label key={loc.code} className="pm-import-check">
                      <input
                        type="checkbox"
                        checked={settings.selectedLocales.includes(loc.code)}
                        onChange={(e) => {
                          const on = e.target.checked;
                          setSettings((s) => ({
                            ...s,
                            selectedLocales: on
                              ? [...s.selectedLocales, loc.code]
                              : s.selectedLocales.filter((c) => c !== loc.code),
                          }));
                        }}
                      />
                      {loc.label} <span className="pm-muted">({loc.code})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <label className="pm-import-check">
              <input
                type="checkbox"
                checked={settings.autoGenerateStubs}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, autoGenerateStubs: e.target.checked }))
                }
              />
              Auto-generate localized stubs (placeholder copy, pending translation)
            </label>

            <label className="pm-import-check">
              <input
                type="checkbox"
                checked={settings.localizedOverwrite}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, localizedOverwrite: e.target.checked }))
                }
              />
              Overwrite existing localized JSON files
            </label>

            <label className="pm-import-check">
              <input
                type="checkbox"
                checked={settings.onlyMissingLocales}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, onlyMissingLocales: e.target.checked }))
                }
              />
              Only missing locales (skip locales that already have this slug)
            </label>

            <label className="pm-import-field">
              <span>When source slug exists on disk</span>
              <select
                value={settings.duplicatePolicy}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    duplicatePolicy: e.target.value === "skip" ? "skip" : "overwrite",
                  }))
                }
              >
                <option value="overwrite">Overwrite existing product</option>
                <option value="skip">Skip (keep existing)</option>
              </select>
            </label>

            <label className="pm-import-field">
              <span>Slug conflict / collision handling</span>
              <select
                value={settings.slugConflict}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    slugConflict: e.target.value as ImportSettings["slugConflict"],
                  }))
                }
              >
                <option value="suffix">Allocate suffix (slug-2, …)</option>
                <option value="skip">Skip product</option>
                <option value="error">Fail this product</option>
              </select>
            </label>

            <label className="pm-import-check">
              <input
                type="checkbox"
                checked={settings.skipCollectionSync}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, skipCollectionSync: e.target.checked }))
                }
              />
              Skip per-product collection sync during import (faster; run “Sync Collections” after)
            </label>

            <p className="pm-hint pm-import-locale-preview">
              <strong>Locale mapping preview:</strong>{" "}
              {settings.importToAllLocales
                ? `all configured (${catalogLocales.map((l) => l.code).join(", ")})`
                : (effectiveTargetLocales as string[]).join(", ")}
            </p>
          </fieldset>

          {progress.total > 0 && (
            <div className="pm-import-progress" role="status" aria-live="polite">
              <div className="pm-import-progress__bar">
                <div
                  className="pm-import-progress__fill"
                  style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                />
              </div>
              <p className="pm-import-progress__text">
                {progress.label} ({progress.done}/{progress.total})
              </p>
            </div>
          )}

          {fatalError && <p className="pm-error">{fatalError}</p>}

          {summary && (
            <div className="pm-import-summary">
              <h3 className="pm-import-summary__title">Import summary</h3>
              <p>
                OK: <strong>{summary.aggregate.ok}</strong> · Skipped:{" "}
                <strong>{summary.aggregate.skipped}</strong> · Errors:{" "}
                <strong>{summary.aggregate.error}</strong>
              </p>
              <div className="pm-import-summary__scroll">
                <table className="pm-import-summary__table">
                  <thead>
                    <tr>
                      <th>File</th>
                      <th>Slug</th>
                      <th>Status</th>
                      <th>Locales</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.rows.map((r, i) => (
                      <tr key={`${r.slug}-${i}`} className={r.status === "error" ? "pm-import-summary__row--err" : ""}>
                        <td><code>{r.sourceFile ?? "—"}</code></td>
                        <td><code>{r.slug}</code></td>
                        <td>{r.status}</td>
                        <td>{(r.localesWritten ?? []).join(", ") || "—"}</td>
                        <td className="pm-import-summary__notes">
                          {[...r.errors, ...r.warnings].join(" · ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <footer className="pm-import-dialog__foot">
          <button type="button" className="pm-btn-secondary" onClick={handleClose} disabled={busy}>
            {summary ? "Close" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => void runImport()}
            disabled={busy || totalProducts === 0}
          >
            {busy ? "Importing…" : settings.dryRun ? "Run dry run" : "Start import"}
          </button>
        </footer>
      </div>
    </div>
  );
}
