"use client";

import { useMemo, useState, useTransition } from "react";
import type { LocaleConfig } from "@prisma/client";
import type { MissingTranslation, TranslationCompletionStats } from "@/features/translation/types";
import { listRegisteredEntityTypes } from "@/features/translation/entity-registry";
import {
  bulkUpsertTranslationsAction,
  findMissingForCellAction,
  searchTranslationsAction,
} from "@/features/translation/actions";
import { AdminCardGrid } from "@/components/admin/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompletionBadge, TranslationStatusBadge } from "./translation-status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Languages, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { completionTierClass, getCompletionTier } from "@/features/translation/completion-utils";

type MatrixRow = {
  entityType: string;
  label: string;
  locales: Record<string, TranslationCompletionStats>;
};

type Props = {
  locales: LocaleConfig[];
  completionMatrix: MatrixRow[];
  priorityMissing: MissingTranslation[];
};

type StatusFilter = "all" | "missing" | "draft" | "published";

export function TranslationsDashboard({
  locales,
  completionMatrix,
  priorityMissing,
}: Props) {
  const [query, setQuery] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [languageCode, setLanguageCode] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [englishSearch, setEnglishSearch] = useState("");
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchTranslationsAction>>>([]);
  const [isPending, startTransition] = useTransition();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCell, setDrawerCell] = useState<{ entityType: string; languageCode: string } | null>(
    null
  );
  const [drawerItems, setDrawerItems] = useState<
    (MissingTranslation & { draftValue?: string })[]
  >([]);
  const [drawerSaving, setDrawerSaving] = useState(false);

  const entityTypes = listRegisteredEntityTypes();
  const enabledLocales = locales.filter((l) => l.isEnabled);
  const nonDefaultLocales = enabledLocales.filter((l) => !l.isDefault);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    startTransition(async () => {
      const rows = await searchTranslationsAction(
        query.trim(),
        entityTypeFilter === "all" ? undefined : entityTypeFilter,
        languageCode === "all" ? undefined : languageCode
      );
      setResults(rows);
    });
  }

  const filteredResults = useMemo(() => {
    let rows = results;
    if (statusFilter === "published") {
      rows = rows.filter((r) => r.status === "PUBLISHED");
    } else if (statusFilter === "draft") {
      rows = rows.filter((r) => r.status === "DRAFT");
    } else if (statusFilter === "missing") {
      rows = [];
    }
    return rows;
  }, [results, statusFilter]);

  const overallCompletion =
    completionMatrix.length > 0 && nonDefaultLocales.length > 0
      ? Math.round(
          completionMatrix.reduce((sum, row) => {
            const localePct =
              nonDefaultLocales.reduce(
                (s, l) => s + (row.locales[l.code]?.percentage ?? 0),
                0
              ) / nonDefaultLocales.length;
            return sum + localePct;
          }, 0) / completionMatrix.length
        )
      : 100;

  const filteredMatrix = useMemo(() => {
    if (entityTypeFilter === "all") return completionMatrix;
    return completionMatrix.filter((r) => r.entityType === entityTypeFilter);
  }, [completionMatrix, entityTypeFilter]);

  const openQuickEdit = (entityType: string, languageCode: string) => {
    setDrawerCell({ entityType, languageCode });
    setDrawerOpen(true);
    startTransition(async () => {
      const missing = await findMissingForCellAction(entityType, languageCode, 100);
      setDrawerItems(missing.map((m) => ({ ...m, draftValue: "" })));
    });
  };

  const updateDrawerItem = (index: number, value: string) => {
    setDrawerItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], draftValue: value };
      return next;
    });
  };

  const bulkSaveDrawer = async () => {
    if (!drawerCell) return;
    setDrawerSaving(true);
    try {
      const inputs = drawerItems
        .filter((item) => item.draftValue?.trim())
        .map((item) => ({
          entityType: item.entityType,
          entityId: item.entityId,
          field: item.field,
          languageCode: item.languageCode,
          value: item.draftValue!,
          status: "PUBLISHED" as const,
        }));
      if (inputs.length > 0) {
        await bulkUpsertTranslationsAction(inputs);
      }
      setDrawerOpen(false);
    } finally {
      setDrawerSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Translations</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage content translations across all entity types and languages.
          </p>
        </div>
        <Link href="/admin/languages">
          <Button variant="outline" className="gap-2">
            <Languages className="h-4 w-4" />
            Manage Languages
          </Button>
        </Link>
      </div>

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

      {priorityMissing.length > 0 ? (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              High Priority Missing Translations
            </CardTitle>
            <CardDescription>
              Priority fields with no translation in a non-English locale
            </CardDescription>
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
                      <td className="py-2 pr-4 uppercase">{row.languageCode}</td>
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

      <Card>
        <CardHeader>
          <CardTitle>Completion matrix</CardTitle>
          <CardDescription>
            Click a cell to quick-edit missing fields for that type and locale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="space-y-2 w-48">
              <Label>Entity type</Label>
              <select
                className="w-full border rounded-md h-10 px-3 text-sm bg-background"
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
              >
                <option value="all">All types</option>
                {entityTypes.map((e) => (
                  <option key={e.type} value={e.type}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left font-medium sticky left-0 bg-background">Type</th>
                  {nonDefaultLocales.map((l) => (
                    <th key={l.code} className="p-2 text-center font-medium min-w-[80px]">
                      {l.flag} {l.code.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMatrix.map((row) => (
                  <tr key={row.entityType} className="border-b border-muted/50">
                    <td className="p-2 font-medium sticky left-0 bg-background">
                      {row.label}
                    </td>
                    {nonDefaultLocales.map((l) => {
                      const stat = row.locales[l.code];
                      const pct = stat?.percentage ?? 0;
                      const tier = getCompletionTier(pct);
                      return (
                        <td key={l.code} className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => openQuickEdit(row.entityType, l.code)}
                            className={cn(
                              "inline-flex rounded-md border px-2 py-1 text-xs tabular-nums transition-opacity hover:opacity-80",
                              completionTierClass(tier)
                            )}
                          >
                            {pct}%
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search translations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4 mb-4">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label>Query</Label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search translation values..."
              />
            </div>
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label>English source search</Label>
              <Input
                value={englishSearch}
                onChange={(e) => setEnglishSearch(e.target.value)}
                placeholder="Filter by English source..."
              />
            </div>
            <div className="space-y-2 w-48">
              <Label>Entity type</Label>
              <select
                className="w-full border rounded-md h-10 px-3 text-sm bg-background"
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
              >
                <option value="all">All types</option>
                {entityTypes.map((e) => (
                  <option key={e.type} value={e.type}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 w-40">
              <Label>Language</Label>
              <select
                className="w-full border rounded-md h-10 px-3 text-sm bg-background"
                value={languageCode}
                onChange={(e) => setLanguageCode(e.target.value)}
              >
                <option value="all">All</option>
                {enabledLocales.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 w-40">
              <Label>Status</Label>
              <select
                className="w-full border rounded-md h-10 px-3 text-sm bg-background"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="all">All</option>
                <option value="missing">Missing</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Searching..." : "Search"}
              </Button>
            </div>
          </form>

          {filteredResults.length > 0 ? (
            <div className="space-y-2">
              {filteredResults
                .filter(
                  (row) =>
                    !englishSearch.trim() ||
                    row.value.toLowerCase().includes(englishSearch.toLowerCase())
                )
                .map((row) => (
                  <div
                    key={row.id}
                    className="flex items-start justify-between gap-4 p-3 rounded-lg border text-sm"
                  >
                    <div>
                      <span className="font-medium">
                        {row.entityType}.{row.field}
                      </span>
                      <span className="text-muted-foreground ml-2">({row.languageCode})</span>
                      <p className="mt-1 text-muted-foreground line-clamp-2">{row.value}</p>
                    </div>
                    <TranslationStatusBadge status={row.status} />
                  </div>
                ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Quick edit — {drawerCell?.entityType}</DialogTitle>
            <DialogDescription>
              Untranslated fields for {drawerCell?.languageCode?.toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            {isPending && drawerItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
            ) : drawerItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                All fields translated for this combination.
              </p>
            ) : (
              <div className="space-y-4">
                {drawerItems.map((item, i) => (
                  <div key={`${item.entityId}-${item.field}`} className="grid gap-2 md:grid-cols-3 border-b pb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">{item.field}</p>
                      <p className="text-sm font-mono truncate">{item.entityId.slice(0, 12)}…</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">English</p>
                      <p className="text-sm line-clamp-3">{item.sourceValue ?? "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs">Translation</Label>
                      <Textarea
                        rows={2}
                        value={item.draftValue ?? ""}
                        onChange={(e) => updateDrawerItem(i, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void bulkSaveDrawer()} disabled={drawerSaving}>
              {drawerSaving ? "Saving…" : "Bulk save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
