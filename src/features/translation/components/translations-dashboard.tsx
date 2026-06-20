"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { LocaleConfig } from "@prisma/client";
import type { MissingTranslation, TranslationCompletionStats } from "@/features/translation/types";
import type { EditableTranslationRow } from "@/features/translation/translation-grid-types";
import {
  parseTranslationCellKey,
} from "@/features/translation/translation-grid-types";
import { listRegisteredEntityTypes } from "@/features/translation/entity-registry";
import {
  bulkSaveTranslationGridAction,
  exportFilteredGridCsvAction,
  exportLocaleBundleAction,
  findPriorityMissingAction,
  getCompletionMatrixAction,
  listEditableTranslationsAction,
  processTranslationJobsAction,
  queueAiTranslationAction,
} from "@/features/translation/actions";
import { AdminCardGrid } from "@/components/admin/layout/admin-shell";
import { AdminCollapsibleSection } from "@/components/admin/layout/admin-collapsible-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompletionBadge } from "./translation-status-badge";
import {
  TranslationsSpreadsheetGrid,
  type DirtyCell,
} from "./translations-spreadsheet-grid";
import { TranslationsImportDialog } from "./translations-import-dialog";
import {
  Languages,
  AlertTriangle,
  Sparkles,
  Save,
  RotateCcw,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type MatrixRow = {
  entityType: string;
  label: string;
  locales: Record<string, TranslationCompletionStats>;
};

type Props = {
  locales: LocaleConfig[];
};

type StatusFilter = "all" | "missing" | "draft" | "published";

const PAGE_SIZE = 25;

export function TranslationsDashboard({ locales }: Props) {
  const entityTypes = listRegisteredEntityTypes();
  const enabledLocales = useMemo(() => locales.filter((l) => l.isEnabled), [locales]);
  const localeCodes = useMemo(() => enabledLocales.map((l) => l.code), [enabledLocales]);
  const defaultLocale = enabledLocales.find((l) => l.isDefault) ?? enabledLocales[0];
  const defaultLocaleCode = defaultLocale?.code ?? "en";
  const gridLocales = useMemo(
    () => enabledLocales.filter((l) => l.code !== defaultLocaleCode),
    [enabledLocales, defaultLocaleCode]
  );

  const [entityTypeFilter, setEntityTypeFilter] = useState<string>(
    () => entityTypes.find((e) => e.type === "CmsPage")?.type ?? entityTypes[0]?.type ?? "CmsPage"
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const [gridRows, setGridRows] = useState<EditableTranslationRow[]>([]);
  const [gridTotal, setGridTotal] = useState(0);
  const [gridLoading, setGridLoading] = useState(true);
  const [gridError, setGridError] = useState<string | null>(null);

  const [dirtyCells, setDirtyCells] = useState<Record<string, DirtyCell>>({});
  const [cellFeedback, setCellFeedback] = useState<Record<string, "saved" | "error">>({});
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const [completionMatrix, setCompletionMatrix] = useState<MatrixRow[]>([]);
  const [priorityMissing, setPriorityMissing] = useState<MissingTranslation[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const [importOpen, setImportOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [aiLocale, setAiLocale] = useState("");
  const [aiEntityType, setAiEntityType] = useState<string>("all");
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  const effectiveAiLocale = aiLocale || gridLocales[0]?.code || "";
  const dirtyCount = Object.keys(dirtyCells).length;
  const totalPages = Math.max(1, Math.ceil(gridTotal / PAGE_SIZE));

  const loadGrid = useCallback(async () => {
    if (!entityTypeFilter) return;
    setGridLoading(true);
    setGridError(null);
    try {
      const result = await listEditableTranslationsAction({
        entityType: entityTypeFilter,
        localeCodes,
        defaultLocaleCode,
        search: search.trim() || undefined,
        statusFilter,
        page,
        pageSize: PAGE_SIZE,
      });
      setGridRows(result.rows);
      setGridTotal(result.total);
    } catch (error) {
      setGridError(error instanceof Error ? error.message : "Failed to load translations");
    } finally {
      setGridLoading(false);
    }
  }, [entityTypeFilter, localeCodes, defaultLocaleCode, search, statusFilter, page]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!entityTypeFilter) return;
      setGridLoading(true);
      setGridError(null);
      try {
        const result = await listEditableTranslationsAction({
          entityType: entityTypeFilter,
          localeCodes,
          defaultLocaleCode,
          search: search.trim() || undefined,
          statusFilter,
          page,
          pageSize: PAGE_SIZE,
        });
        if (cancelled) return;
        setGridRows(result.rows);
        setGridTotal(result.total);
      } catch (error) {
        if (cancelled) return;
        const errName = error instanceof Error ? error.name : "unknown";
        const errMsg = error instanceof Error ? error.message : String(error);
        setGridError(errMsg);
      } finally {
        if (!cancelled) setGridLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entityTypeFilter, localeCodes, defaultLocaleCode, search, statusFilter, page]);

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    Promise.all([getCompletionMatrixAction(), findPriorityMissingAction(30)])
      .then(([matrix, missing]) => {
        if (cancelled) return;
        setCompletionMatrix(matrix);
        setPriorityMissing(missing);
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const overallCompletion = useMemo(() => {
    if (completionMatrix.length === 0 || gridLocales.length === 0) return 100;
    return Math.round(
      completionMatrix.reduce((sum, row) => {
        const localePct =
          gridLocales.reduce((s, l) => s + (row.locales[l.code]?.percentage ?? 0), 0) /
          gridLocales.length;
        return sum + localePct;
      }, 0) / completionMatrix.length
    );
  }, [completionMatrix, gridLocales]);

  const handleCellChange = useCallback(
    (key: string, patch: Partial<DirtyCell>) => {
      setDirtyCells((prev) => {
        const parsed = parseTranslationCellKey(key);
        if (!parsed) return prev;

        const row = gridRows.find(
          (r) =>
            r.entityType === parsed.entityType &&
            r.entityId === parsed.entityId &&
            r.field === parsed.field
        );
        const baseCell = row?.cells[parsed.localeCode];
        const existing = prev[key];

        const originalValue = existing?.originalValue ?? baseCell?.value ?? "";
        const originalStatus = existing?.originalStatus ?? baseCell?.status;

        const next: DirtyCell = {
          value: patch.value ?? existing?.value ?? baseCell?.value ?? "",
          status: patch.status ?? existing?.status ?? baseCell?.status ?? "PUBLISHED",
          originalValue,
          originalStatus,
          markedDelete: patch.markedDelete ?? existing?.markedDelete,
        };

        if (patch.markedDelete) {
          next.value = "";
        }

        const unchanged =
          !next.markedDelete &&
          next.value === originalValue &&
          (next.status ?? "PUBLISHED") === (originalStatus ?? "PUBLISHED");
        const clearedUnchanged = next.markedDelete && !originalValue.trim();

        if (unchanged || clearedUnchanged) {
          const copy = { ...prev };
          delete copy[key];
          return copy;
        }

        return { ...prev, [key]: next };
      });
      setCellFeedback((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    },
    [gridRows]
  );

  const handleRevertDirty = () => {
    setDirtyCells({});
    setCellFeedback({});
    setSaveNotice(null);
  };

  const handleSaveAll = () => {
    const cells = Object.entries(dirtyCells).map(([key, dirty]) => {
      const parsed = parseTranslationCellKey(key);
      if (!parsed) return null;
      return {
        entityType: parsed.entityType,
        entityId: parsed.entityId,
        field: parsed.field,
        localeCode: parsed.localeCode,
        value: dirty.value,
        status: dirty.status,
        delete: dirty.markedDelete,
      };
    }).filter(Boolean);

    if (cells.length === 0) return;

    startTransition(async () => {
      const result = await bulkSaveTranslationGridAction(
        cells as Parameters<typeof bulkSaveTranslationGridAction>[0]
      );

      const feedback: Record<string, "saved" | "error"> = {};
      for (const key of Object.keys(dirtyCells)) {
        feedback[key] = result.errors.some((e) => e.key === key) ? "error" : "saved";
      }
      setCellFeedback(feedback);

      if (result.success) {
        setDirtyCells({});
        setSaveNotice(
          `Saved ${result.upsertedCount} cell(s)${result.deletedCount ? `, cleared ${result.deletedCount}` : ""}.`
        );
        await loadGrid();
      } else {
        setSaveNotice(`Saved with ${result.errors.length} error(s).`);
      }
    });
  };

  const handleExportGrid = () => {
    startTransition(async () => {
      const csv = await exportFilteredGridCsvAction({
        entityType: entityTypeFilter,
        localeCodes,
        defaultLocaleCode,
        search: search.trim() || undefined,
        statusFilter,
      });
      downloadFile(csv, `translations-${entityTypeFilter}.csv`, "text/csv");
    });
  };

  const handleExportLocaleBundle = (localeCode: string) => {
    startTransition(async () => {
      const bundle = await exportLocaleBundleAction(localeCode);
      downloadFile(bundle.csv, `entity-translations-${localeCode}.csv`, "text/csv");
      downloadFile(
        bundle.messagesJson,
        `messages-${localeCode}.json`,
        "application/json"
      );
    });
  };

  const handleQueueAiTranslation = () => {
    if (!effectiveAiLocale) return;
    if (
      !confirm(
        `Queue AI translation for ${effectiveAiLocale.toUpperCase()}? Results are saved as drafts.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      await queueAiTranslationAction(
        effectiveAiLocale,
        aiEntityType === "all" ? undefined : aiEntityType
      );
      const result = await processTranslationJobsAction();
      setAiNotice(
        `Processed ${result.processedJobs} job(s), translated ${result.translatedFields} field(s).`
      );
      await loadGrid();
    });
  };

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void loadGrid();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Translations</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Spreadsheet editor for inline translation control across all entity types.
          </p>
        </div>
        <Link href="/admin/languages">
          <Button variant="outline" className="gap-2">
            <Languages className="h-4 w-4" />
            Manage Languages
          </Button>
        </Link>
      </div>

      {/* Toolbar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Translation editor</CardTitle>
          <CardDescription>
            Select an entity type, edit cells inline, then save changes. Empty cells can be filled
            to create new translations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={applyFilters} className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5 w-48">
              <Label>Entity type</Label>
              <select
                className="w-full border rounded-md h-10 px-3 text-sm bg-background"
                value={entityTypeFilter}
                onChange={(e) => {
                  setEntityTypeFilter(e.target.value);
                  setPage(1);
                  setDirtyCells({});
                }}
              >
                {entityTypes.map((e) => (
                  <option key={e.type} value={e.type}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 flex-1 min-w-[180px]">
              <Label>Search</Label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search translation values…"
              />
            </div>
            <div className="space-y-1.5 w-40">
              <Label>Status</Label>
              <select
                className="w-full border rounded-md h-10 px-3 text-sm bg-background"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as StatusFilter);
                  setPage(1);
                }}
              >
                <option value="all">All</option>
                <option value="missing">Missing</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <Button type="submit" variant="secondary" disabled={gridLoading}>
              Apply filters
            </Button>
          </form>

          <div className="flex flex-wrap gap-2 items-center border-t pt-4">
            <Button
              onClick={handleSaveAll}
              disabled={dirtyCount === 0 || isPending}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isPending ? "Saving…" : `Save changes (${dirtyCount})`}
            </Button>
            <Button
              variant="outline"
              onClick={handleRevertDirty}
              disabled={dirtyCount === 0 || isPending}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Revert
            </Button>
            <Button
              variant="outline"
              onClick={handleExportGrid}
              disabled={isPending}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export grid CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
            {gridLocales[0] ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExportLocaleBundle(gridLocales[0].code)}
                disabled={isPending}
              >
                Export {gridLocales[0].code.toUpperCase()} bundle
              </Button>
            ) : null}
          </div>

          {saveNotice ? (
            <p className={cn("text-sm", saveNotice.includes("error") ? "text-destructive" : "text-muted-foreground")}>
              {saveNotice}
            </p>
          ) : null}
          {gridError ? (
            <p className="text-destructive text-sm" role="alert">
              {gridError}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Spreadsheet grid */}
      <Card>
        <CardContent className="pt-6">
          {gridLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading translations…</p>
          ) : (
            <>
              <TranslationsSpreadsheetGrid
                rows={gridRows}
                localeColumns={gridLocales}
                defaultLocaleCode={defaultLocaleCode}
                dirtyCells={dirtyCells}
                onCellChange={handleCellChange}
                cellFeedback={cellFeedback}
                disabled={isPending}
              />
              <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                <span>
                  {gridTotal} row(s) · page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || isPending}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || isPending}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Footer summary */}
      {dirtyCount > 0 ? (
        <div className="sticky bottom-4 z-30 mx-auto max-w-xl rounded-lg border bg-background/95 backdrop-blur px-4 py-3 shadow-lg flex items-center justify-between gap-4">
          <span className="text-sm">
            <strong>{dirtyCount}</strong> unsaved change(s)
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleRevertDirty}>
              Revert
            </Button>
            <Button size="sm" onClick={handleSaveAll} disabled={isPending}>
              Save all
            </Button>
          </div>
        </div>
      ) : null}

      <TranslationsImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onApplied={() => {
          void loadGrid();
          setDirtyCells({});
        }}
      />

      {/* Collapsible secondary panels */}
      <AdminCollapsibleSection
        title="Overview & completion"
        description="Translation coverage stats and AI queue"
        defaultOpen={false}
      >
        <div className="space-y-6">
          {!statsLoading ? (
            <AdminCardGrid>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Overall completion</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    {overallCompletion}%
                    <CompletionBadge percentage={overallCompletion} />
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Enabled languages</CardDescription>
                  <CardTitle className="text-3xl">{enabledLocales.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Entity types</CardDescription>
                  <CardTitle className="text-3xl">{entityTypes.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Priority missing</CardDescription>
                  <CardTitle className="text-3xl text-destructive">{priorityMissing.length}</CardTitle>
                </CardHeader>
              </Card>
            </AdminCardGrid>
          ) : null}

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4" />
                AI translation queue
              </CardTitle>
              <CardDescription>
                Queue AI translation for missing fields. Output is saved as DRAFT for review.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-4">
              <div className="space-y-2 w-40">
                <Label>Target locale</Label>
                <select
                  className="w-full border rounded-md h-10 px-3 text-sm bg-background"
                  value={effectiveAiLocale}
                  onChange={(e) => setAiLocale(e.target.value)}
                >
                  {gridLocales.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 w-48">
                <Label>Entity type</Label>
                <select
                  className="w-full border rounded-md h-10 px-3 text-sm bg-background"
                  value={aiEntityType}
                  onChange={(e) => setAiEntityType(e.target.value)}
                >
                  <option value="all">All types</option>
                  {entityTypes.map((e) => (
                    <option key={e.type} value={e.type}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                disabled={isPending || !effectiveAiLocale}
                onClick={handleQueueAiTranslation}
              >
                {isPending ? "Processing…" : "Queue AI translation"}
              </Button>
              {aiNotice ? <p className="text-sm text-muted-foreground w-full">{aiNotice}</p> : null}
            </CardContent>
          </Card>

          {priorityMissing.length > 0 ? (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  High priority missing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Type</th>
                        <th className="pb-2 pr-4 font-medium">Field</th>
                        <th className="pb-2 pr-4 font-medium">Language</th>
                        <th className="pb-2 font-medium">English source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priorityMissing.map((row, i) => (
                        <tr key={i} className="border-b border-muted/50">
                          <td className="py-2 pr-4">{row.entityType}</td>
                          <td className="py-2 pr-4">{row.field}</td>
                          <td className="py-2 pr-4 uppercase">{row.localeCode}</td>
                          <td className="py-2 text-muted-foreground truncate max-w-xs">
                            {row.sourceValue?.slice(0, 80) ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </AdminCollapsibleSection>
    </div>
  );
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
