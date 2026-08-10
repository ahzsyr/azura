"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import {
  backupJsonStoreAction,
  clearJsonNamespaceAction,
  deleteJsonRecordAction,
  exportDataSourceRecordsAction,
  exportJsonNamespaceAction,
  exportPlatformReportAction,
  getModelFieldsAction,
  importJsonNamespaceAction,
  inspectDataSourceRecordAction,
  listJsonRecordsAction,
  listDataSourceRecordsAction,
  markStaleFormSubmissionsAction,
  restoreJsonStoreAction,
  revalidateAdminPathsAction,
  runDiagnosticsAction,
  searchDataSourcesAction,
  upsertJsonRecordAction,
} from "@/features/data-platform/actions";
import type {
  DataSourceClientMeta,
  PlatformOverview,
  PrismaMetadataField,
  SchemaModelInfo,
  SearchResult,
} from "@/features/data-platform/types";
import type { DiagnosticReport } from "@/features/data-platform/diagnostics/types";
import { DIAGNOSTIC_CHECKS_CATALOG } from "@/features/data-platform/diagnostics/catalog";
import { RecordInspector } from "./record-inspector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type JsonRow = {
  id: string;
  namespace: string;
  key: string;
  data: unknown;
  version: number;
  updatedAt: string | Date;
};

type Tab = "overview" | "json" | "explorer" | "schema" | "diagnostics" | "operations";

type ToastState = { message: string; type: "success" | "error" } | null;

type Props = {
  overview: PlatformOverview;
  schema: SchemaModelInfo[];
  jsonSources: DataSourceClientMeta[];
  browsableSources: DataSourceClientMeta[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  pass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  warn: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  fail: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  skipped: "bg-muted text-muted-foreground",
};

const FIELD_TYPE_COLORS: Record<string, string> = {
  String: "bg-blue-100 text-blue-800",
  Int: "bg-green-100 text-green-800",
  Float: "bg-green-100 text-green-800",
  Boolean: "bg-yellow-100 text-yellow-800",
  DateTime: "bg-purple-100 text-purple-800",
  Json: "bg-orange-100 text-orange-800",
  Relation: "bg-muted text-muted-foreground",
};

const SEVERITY_LABEL: Record<string, string> = {
  error: "🔴",
  warning: "🟡",
  info: "🔵",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataPlatformConsole({
  overview,
  schema,
  jsonSources,
  browsableSources,
}: Props) {
  const [tab, setTab] = useState<Tab>("overview");

  // JSON Configuration state
  const defaultNs = jsonSources[0]?.namespace ?? "settings";
  const [namespace, setNamespace] = useState<string>(defaultNs);
  const [jsonRows, setJsonRows] = useState<JsonRow[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editorJson, setEditorJson] = useState("");
  const [newKey, setNewKey] = useState("");

  // Operations state
  const [opNamespace, setOpNamespace] = useState<string>(defaultNs);
  const [exportData, setExportData] = useState("");
  const [importData, setImportData] = useState("");
  const [restoreData, setRestoreData] = useState("");
  const [reportData, setReportData] = useState("");

  // Data Explorer state
  const firstBrowsable = browsableSources[0]?.id ?? "";
  const [explorerSource, setExplorerSource] = useState<string>(firstBrowsable);
  const [explorerItems, setExplorerItems] = useState<unknown[]>([]);
  const [explorerTotal, setExplorerTotal] = useState(0);
  const [explorerPage, setExplorerPage] = useState(1);
  const [inspectedRecord, setInspectedRecord] = useState<Record<string, unknown> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Schema Explorer state
  const [hideDisabled, setHideDisabled] = useState(false);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [expandedModelTab, setExpandedModelTab] = useState<"fields" | "relations">("fields");
  const [modelFields, setModelFields] = useState<Map<string, PrismaMetadataField[]>>(new Map());

  // Diagnostics state
  const [diagnosticReport, setDiagnosticReport] = useState<DiagnosticReport | null>(null);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);

  // Toast + dialogs
  const [toast, setToast] = useState<ToastState>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [clearTarget, setClearTarget] = useState<string | null>(null);

  const [pending, startTransition] = useTransition();

  // ---------------------------------------------------------------------------
  // Toast helper
  // ---------------------------------------------------------------------------

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ---------------------------------------------------------------------------
  // JSON Configuration
  // ---------------------------------------------------------------------------

  const loadJsonNamespace = useCallback((ns: string) => {
    startTransition(async () => {
      try {
        const rows = await listJsonRecordsAction(ns);
        setJsonRows(rows as JsonRow[]);
        setSelectedKey(null);
        setEditorJson("");
      } catch (e) {
        showToast(`Failed to load namespace: ${e instanceof Error ? e.message : "unknown error"}`, "error");
      }
    });
  }, [showToast]);

  // ---------------------------------------------------------------------------
  // Schema: lazy field loading
  // ---------------------------------------------------------------------------

  const loadModelFields = useCallback((modelName: string) => {
    if (modelFields.has(modelName)) return;
    startTransition(async () => {
      try {
        const fields = await getModelFieldsAction(modelName);
        setModelFields((prev) => new Map(prev).set(modelName, fields as PrismaMetadataField[]));
      } catch {
        // non-fatal — field viewer just shows nothing
      }
    });
  }, [modelFields]);

  // ---------------------------------------------------------------------------
  // Data Explorer
  // ---------------------------------------------------------------------------

  const loadExplorerSource = useCallback((sourceId: string, page: number) => {
    setIsSearchMode(false);
    setSearchQuery("");
    setSearchResults(null);
    startTransition(async () => {
      try {
        const result = await listDataSourceRecordsAction(sourceId, page);
        setExplorerItems(result.items as unknown[]);
        setExplorerTotal(result.total);
        setExplorerPage(page);
        setInspectedRecord(null);
      } catch (e) {
        showToast(`Failed to load records: ${e instanceof Error ? e.message : "unknown error"}`, "error");
      }
    });
  }, [showToast]);

  const inspectRecord = useCallback((sourceId: string, id: string) => {
    startTransition(async () => {
      try {
        const record = await inspectDataSourceRecordAction(sourceId, id);
        setInspectedRecord(record as Record<string, unknown>);
        setExplorerSource(sourceId);
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Failed to load record", "error");
      }
    });
  }, [showToast]);

  const runSearch = useCallback((query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults(null);
      setIsSearchMode(false);
      return;
    }
    setIsSearchMode(true);
    startTransition(async () => {
      try {
        const results = await searchDataSourcesAction(query);
        setSearchResults(results as SearchResult[]);
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Search failed", "error");
        setSearchResults([]);
      }
    });
  }, [showToast]);

  // ---------------------------------------------------------------------------
  // Tab bar
  // ---------------------------------------------------------------------------

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "json", label: "JSON Configuration" },
    { id: "explorer", label: "Data Explorer" },
    { id: "schema", label: "Schema Explorer" },
    { id: "diagnostics", label: "Diagnostics" },
    { id: "operations", label: "Operations" },
  ];

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function getRowLabel(item: unknown): string {
    const row = item as Record<string, unknown>;
    for (const key of ["slug", "name", "email", "filename", "canonicalSlug", "pageSlug", "title"]) {
      const v = row[key];
      if (v != null && String(v).trim()) return String(v);
    }
    return String(row.id ?? "");
  }

  function getRowSubtitle(item: unknown): string | null {
    const row = item as Record<string, unknown>;
    const parts = [row.status, row.mimeType, row.email, row.brand, row.segment]
      .filter((v) => v != null && String(v).trim())
      .map(String);
    // Avoid duplicating the title field in the subtitle.
    const title = getRowLabel(item);
    const filtered = parts.filter((p) => p !== title);
    return filtered.length > 0 ? filtered.join(" · ") : null;
  }

  function currentBrowsableSource(): DataSourceClientMeta | undefined {
    return browsableSources.find((s) => s.id === explorerSource);
  }

  const visibleSchema = hideDisabled
    ? schema.filter((m) => m.profileEnabled !== false)
    : schema;

  const profileLabel = overview.activeProfile.label;
  const disabledCount = schema.filter((m) => m.profileEnabled === false).length;

  const hs = overview.healthSignals;

  // Cache namespaces (can be cleared via Operations)
  const cacheNamespaces = jsonSources.filter((s) => s.jsonCategory === "cache");

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              if (t.id === "json") loadJsonNamespace(namespace);
              if (t.id === "explorer") loadExplorerSource(explorerSource, 1);
            }}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              tab === t.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Overview                                                            */}
      {/* ------------------------------------------------------------------ */}

      {tab === "overview" && (
        <div className="space-y-4">
          {overview.databaseError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <strong>Database connection error:</strong> {overview.databaseError}
            </div>
          )}

          {/* Active profile badge */}
          <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-4 py-2.5 text-sm">
            <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
            <span>
              <span className="font-medium">{profileLabel}</span>
              <span className="text-muted-foreground"> deployment profile</span>
            </span>
            {disabledCount > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="text-muted-foreground">
                  {disabledCount} model{disabledCount !== 1 ? "s" : ""} gated by inactive features
                </span>
              </>
            )}
            <button
              type="button"
              className="ms-auto text-xs text-primary hover:underline"
              onClick={() => setTab("schema")}
            >
              View schema →
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Storage providers</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 text-muted-foreground">
                <p>
                  <strong className="text-foreground">MySQL + Prisma</strong> — relational entities
                  (CMS, products, users, inquiries, media) with FK integrity.
                </p>
                <p>
                  <strong className="text-foreground">JSON store</strong> — theme presets, builder
                  templates, page cache, settings, SEO config.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">JSON store entries</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">{overview.jsonEntries}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Relational rows</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {Object.entries(overview.relationalCounts).map(([k, v]) => (
                  <p key={k}>
                    {k}: <span className="font-medium">{v}</span>
                  </p>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Platform Health Score */}
          {(() => {
            if (!diagnosticReport) {
              return (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Platform health</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Run diagnostics to generate a health score.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setTab("diagnostics")}
                    >
                      Go to Diagnostics →
                    </Button>
                  </CardContent>
                </Card>
              );
            }
            const failCount = diagnosticReport.summary.fail;
            const warnCount = diagnosticReport.summary.warn;
            const score = Math.max(0, 100 - failCount * 10 - warnCount * 3);
            const scoreColor =
              score >= 80 ? "text-green-600" : score >= 60 ? "text-amber-600" : "text-red-600";
            const barColor =
              score >= 80 ? "bg-green-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";
            return (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Platform health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-bold ${scoreColor}`}>{score}</span>
                    <span className="text-lg text-muted-foreground">/ 100</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {warnCount > 0 || failCount > 0
                      ? [
                          failCount > 0 ? `${failCount} failure${failCount !== 1 ? "s" : ""}` : null,
                          warnCount > 0 ? `${warnCount} warning${warnCount !== 1 ? "s" : ""}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "All checks passed"}
                    {" · Last run "}
                    {new Date(diagnosticReport.ranAt).toLocaleTimeString()}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setTab("diagnostics")}
                  >
                    View diagnostics →
                  </Button>
                </CardContent>
              </Card>
            );
          })()}

          {/* Health signals */}
          {hs && (hs.contentItems || hs.faqSets || hs.galleries) && (
            <div>
              <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
                Health signals
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hs.contentItems && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Content items</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{hs.contentItems.total}</span>
                        <span className="text-xs text-muted-foreground">total</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        <span className="rounded-full px-2 py-0.5 bg-green-100 text-green-800">
                          {hs.contentItems.published} published
                        </span>
                        {hs.contentItems.draft > 0 && (
                          <span className="rounded-full px-2 py-0.5 bg-muted text-muted-foreground">
                            {hs.contentItems.draft} draft
                          </span>
                        )}
                        {hs.contentItems.scheduled > 0 && (
                          <span className="rounded-full px-2 py-0.5 bg-blue-100 text-blue-800">
                            {hs.contentItems.scheduled} scheduled
                          </span>
                        )}
                        {hs.contentItems.archived > 0 && (
                          <span className="rounded-full px-2 py-0.5 bg-muted text-muted-foreground/60">
                            {hs.contentItems.archived} archived
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {hs.faqSets && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">FAQ sets</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{hs.faqSets.total}</span>
                        <span className="text-xs text-muted-foreground">total</span>
                      </div>
                      <div className="flex gap-1.5 text-xs">
                        <span className="rounded-full px-2 py-0.5 bg-green-100 text-green-800">
                          {hs.faqSets.active} active
                        </span>
                        {hs.faqSets.total - hs.faqSets.active > 0 && (
                          <span className="rounded-full px-2 py-0.5 bg-muted text-muted-foreground">
                            {hs.faqSets.total - hs.faqSets.active} inactive
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {hs.galleries && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Galleries</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{hs.galleries.total}</span>
                        <span className="text-xs text-muted-foreground">total</span>
                      </div>
                      <div className="flex gap-1.5 text-xs">
                        <span className="rounded-full px-2 py-0.5 bg-green-100 text-green-800">
                          {hs.galleries.published} published
                        </span>
                        {hs.galleries.total - hs.galleries.published > 0 && (
                          <span className="rounded-full px-2 py-0.5 bg-muted text-muted-foreground">
                            {hs.galleries.total - hs.galleries.published} draft
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* JSON Configuration                                                  */}
      {/* ------------------------------------------------------------------ */}

      {tab === "json" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Namespace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                value={namespace}
                onChange={(e) => {
                  setNamespace(e.target.value);
                  loadJsonNamespace(e.target.value);
                }}
                className="w-full border rounded-md h-10 px-3 text-sm"
              >
                {jsonSources.map((src) => (
                  <option key={src.namespace} value={src.namespace!}>
                    {src.displayName}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {jsonSources.find((s) => s.namespace === namespace)?.description ?? ""}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full"
                disabled={pending}
                onClick={() => loadJsonNamespace(namespace)}
              >
                Refresh
              </Button>
              <ul className="max-h-64 overflow-y-auto text-sm space-y-1 border rounded-md p-2">
                {jsonRows.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={cn(
                        "w-full text-left px-2 py-1 rounded hover:bg-muted",
                        selectedKey === row.key && "bg-muted font-medium"
                      )}
                      onClick={() => {
                        setSelectedKey(row.key);
                        setEditorJson(JSON.stringify(row.data, null, 2));
                      }}
                    >
                      {row.key}
                      <span className="text-xs text-muted-foreground ms-1">v{row.version}</span>
                    </button>
                  </li>
                ))}
                {jsonRows.length === 0 && (
                  <li className="text-muted-foreground px-2">No records</li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                {selectedKey ? `Edit: ${selectedKey}` : "New record"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedKey && (
                <div className="space-y-2">
                  <Label>Key</Label>
                  <Input
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="record-key"
                  />
                </div>
              )}
              <Textarea
                value={editorJson}
                onChange={(e) => setEditorJson(e.target.value)}
                rows={14}
                className="font-mono text-xs"
                placeholder='{"enabled": true}'
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={pending || (!selectedKey && !newKey)}
                  onClick={() => {
                    const key = selectedKey ?? newKey;
                    startTransition(async () => {
                      try {
                        await upsertJsonRecordAction(namespace, key, editorJson);
                        await loadJsonNamespace(namespace);
                        setNewKey("");
                        showToast("Saved", "success");
                      } catch (e) {
                        showToast(e instanceof Error ? e.message : "Save failed", "error");
                      }
                    });
                  }}
                >
                  Save
                </Button>
                {selectedKey && (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => setDeleteTarget(selectedKey)}
                  >
                    Delete
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedKey(null);
                    setEditorJson("{\n  \n}");
                    setNewKey("");
                  }}
                >
                  New record
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Data Explorer                                                       */}
      {/* ------------------------------------------------------------------ */}

      {tab === "explorer" && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") runSearch(searchQuery); }}
                placeholder="Search across all sources…"
                className="pe-8"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => runSearch(searchQuery)}
            >
              Search
            </Button>
            {isSearchMode && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults(null);
                  setIsSearchMode(false);
                }}
              >
                Clear
              </Button>
            )}
          </div>

          {isSearchMode ? (
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Search results
                    {searchResults && (
                      <span className="text-muted-foreground font-normal text-sm ms-2">
                        · {searchResults.reduce((n, r) => n + r.items.length, 0)} records across {searchResults.length} sources
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pending && <p className="text-sm text-muted-foreground">Searching…</p>}
                  {searchResults && searchResults.length === 0 && !pending && (
                    <p className="text-sm text-muted-foreground">No results for &ldquo;{searchQuery}&rdquo;</p>
                  )}
                  {searchResults && searchResults.length > 0 && (
                    <div className="space-y-4">
                      {searchResults.map((group) => (
                        <div key={group.sourceId}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {group.sourceName}
                            </span>
                            {group.adminHref && (
                              <Link href={group.adminHref} className="text-xs text-primary hover:underline">
                                Open →
                              </Link>
                            )}
                          </div>
                          <ul className="border rounded-md divide-y text-sm">
                            {group.items.map((item) => (
                              <li key={item.id}>
                                <button
                                  type="button"
                                  className="w-full text-left px-3 py-2 hover:bg-muted text-xs"
                                  onClick={() => inspectRecord(group.sourceId, item.id)}
                                >
                                  <span className="font-medium">{item.title}</span>
                                  {item.subtitle && (
                                    <span className="text-muted-foreground ms-2">{item.subtitle}</span>
                                  )}
                                  <span className="text-muted-foreground/60 ms-2 font-mono">{item.id}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {inspectedRecord ? "Record inspector" : "Select a record"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {inspectedRecord ? (
                    <RecordInspector
                      record={inspectedRecord}
                      source={browsableSources.find((s) => s.id === explorerSource)}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Click a search result to inspect it.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Browse records</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Read-only. Edit via dedicated admin screens.
                  </p>
                  <select
                    value={explorerSource}
                    onChange={(e) => {
                      setExplorerSource(e.target.value);
                      loadExplorerSource(e.target.value, 1);
                    }}
                    className="w-full border rounded-md h-10 px-3"
                  >
                    {browsableSources.map((src) => (
                      <option key={src.id} value={src.id}>
                        {src.displayName}
                      </option>
                    ))}
                  </select>
                  {currentBrowsableSource()?.adminHref && (
                    <Link
                      href={currentBrowsableSource()!.adminHref!}
                      className="text-sm text-primary hover:underline"
                    >
                      Open in admin →
                    </Link>
                  )}
                  <ul className="text-sm border rounded-md divide-y max-h-80 overflow-y-auto">
                    {explorerItems.map((item) => {
                      const row = item as { id: string };
                      const subtitle = getRowSubtitle(item);
                      const isSelected =
                        inspectedRecord !== null &&
                        (inspectedRecord as { id?: string }).id === row.id;
                      return (
                        <li key={row.id}>
                          <button
                            type="button"
                            className={cn(
                              "w-full text-left px-3 py-2 hover:bg-muted text-xs transition-colors",
                              isSelected && "bg-muted font-medium"
                            )}
                            onClick={() => inspectRecord(explorerSource, row.id)}
                          >
                            <span className="font-medium">{getRowLabel(item)}</span>
                            {subtitle && (
                              <span className="text-muted-foreground ms-2">{subtitle}</span>
                            )}
                            <span className="text-muted-foreground/60 ms-2 font-mono">{row.id}</span>
                          </button>
                        </li>
                      );
                    })}
                    {explorerItems.length === 0 && (
                      <li className="text-muted-foreground px-3 py-2 text-xs">
                        {pending ? "Loading…" : "No records — select a source above to load."}
                      </li>
                    )}
                  </ul>
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={explorerPage <= 1 || pending}
                      onClick={() => loadExplorerSource(explorerSource, explorerPage - 1)}
                    >
                      Prev
                    </Button>
                    <span className="text-muted-foreground text-xs">
                      Page {explorerPage} · {explorerTotal} total
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={explorerPage * 25 >= explorerTotal || pending}
                      onClick={() => loadExplorerSource(explorerSource, explorerPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                  {/* Export controls */}
                  {explorerTotal > 0 && (
                    <div className="flex gap-2 pt-1 border-t">
                      <span className="text-xs text-muted-foreground self-center">Export (up to 500):</span>
                      {(["json", "csv"] as const).map((fmt) => (
                        <Button
                          key={fmt}
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => {
                            startTransition(async () => {
                              try {
                                const data = await exportDataSourceRecordsAction(explorerSource, fmt);
                                const mime = fmt === "json" ? "application/json" : "text/csv";
                                const ext = fmt;
                                const url = URL.createObjectURL(new Blob([data], { type: mime }));
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `${explorerSource.toLowerCase()}-${Date.now()}.${ext}`;
                                a.click();
                                showToast(`Exported as ${fmt.toUpperCase()}`, "success");
                              } catch (e) {
                                showToast(e instanceof Error ? e.message : "Export failed", "error");
                              }
                            });
                          }}
                        >
                          {fmt.toUpperCase()}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {inspectedRecord ? "Record inspector" : "Select a record"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {inspectedRecord ? (
                    <RecordInspector
                      record={inspectedRecord}
                      source={currentBrowsableSource()}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {pending ? "Loading…" : "Click a row on the left to inspect it."}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Schema Explorer                                                     */}
      {/* ------------------------------------------------------------------ */}

      {tab === "schema" && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-base">
                  Schema explorer
                  <span className="text-muted-foreground font-normal text-sm ms-2">
                    — {visibleSchema.length} of {schema.length} models
                  </span>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Click a row to expand its relations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHideDisabled(!hideDisabled);
                  setExpandedModel(null);
                }}
                className={cn(
                  "text-xs rounded-md border px-3 py-1.5 transition-colors",
                  hideDisabled
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted"
                )}
              >
                {hideDisabled ? "Showing active only" : "Hide inactive"}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pe-4">Model</th>
                    <th className="py-2 pe-4">Storage</th>
                    <th className="py-2 pe-4">Fields</th>
                    <th className="py-2 pe-4">Rows</th>
                    <th className="py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSchema.map((m) => {
                    const isExpanded = expandedModel === m.name;
                    const isDisabled = m.profileEnabled === false;
                    return (
                      <>
                        <tr
                          key={m.name}
                          className={cn(
                            "border-b border-border/50 cursor-pointer transition-colors",
                            isExpanded ? "bg-muted/60" : "hover:bg-muted/30",
                            isDisabled && "opacity-50"
                          )}
                          onClick={() => {
                            if (isExpanded) {
                              setExpandedModel(null);
                            } else {
                              setExpandedModel(m.name);
                              setExpandedModelTab("fields");
                              loadModelFields(m.name);
                            }
                          }}
                        >
                          <td className="py-2 font-medium">
                            <div className="flex items-center gap-2">
                              <span className="text-xs opacity-40">{isExpanded ? "▼" : "▶"}</span>
                              {m.adminHref ? (
                                <Link
                                  href={m.adminHref}
                                  className="hover:underline text-primary"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {m.name}
                                </Link>
                              ) : (
                                m.name
                              )}
                              {isDisabled && (
                                <span className="text-xs text-muted-foreground/60 font-normal">
                                  (inactive)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2">
                            <span
                              className={cn(
                                "rounded px-2 py-0.5 text-xs",
                                m.kind === "json"
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-blue-100 text-blue-900"
                              )}
                            >
                              {m.kind === "json" ? "JSON" : "MySQL"}
                            </span>
                          </td>
                          <td className="py-2 text-muted-foreground text-xs">
                            {m.fieldCount !== undefined ? (
                              <>
                                {m.fieldCount}
                                {m.relationCount ? (
                                  <span className="ms-1 text-muted-foreground/60">
                                    +{m.relationCount}r
                                  </span>
                                ) : null}
                              </>
                            ) : "—"}
                          </td>
                          <td className="py-2 text-muted-foreground">{m.count ?? "—"}</td>
                          <td className="py-2 text-muted-foreground text-xs">{m.note}</td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${m.name}-detail`} className="bg-muted/20">
                            <td colSpan={5} className="px-4 pb-4 pt-2">
                              {/* Sub-tabs */}
                              <div className="flex gap-1 mb-3">
                                {(["fields", "relations"] as const).map((t) => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedModelTab(t);
                                      if (t === "fields") loadModelFields(m.name);
                                    }}
                                    className={cn(
                                      "text-xs rounded px-2.5 py-1 capitalize",
                                      expandedModelTab === t
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-muted"
                                    )}
                                  >
                                    {t}
                                    {t === "fields" && m.fieldCount !== undefined && (
                                      <span className="ms-1 opacity-60">({m.fieldCount})</span>
                                    )}
                                    {t === "relations" && m.relationCount !== undefined && m.relationCount > 0 && (
                                      <span className="ms-1 opacity-60">({m.relationCount})</span>
                                    )}
                                  </button>
                                ))}
                              </div>

                              {/* Fields tab */}
                              {expandedModelTab === "fields" && (
                                <div className="overflow-x-auto">
                                  {(() => {
                                    const fields = modelFields.get(m.name);
                                    if (!fields) {
                                      return (
                                        <p className="text-xs text-muted-foreground italic">
                                          {pending ? "Loading fields…" : "Fields unavailable."}
                                        </p>
                                      );
                                    }
                                    const scalarFields = fields.filter((f) => !f.isRelation);
                                    const relationFields = fields.filter((f) => f.isRelation);
                                    return (
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="border-b text-left text-muted-foreground">
                                            <th className="py-1.5 pe-4 font-medium">Field</th>
                                            <th className="py-1.5 pe-4 font-medium">Type</th>
                                            <th className="py-1.5 pe-4 font-medium">Flags</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {scalarFields.map((f) => (
                                            <tr key={f.name} className="border-b border-border/30">
                                              <td className="py-1 pe-4 font-mono">{f.name}</td>
                                              <td className="py-1 pe-4">
                                                <span className={cn(
                                                  "rounded px-1.5 py-0.5",
                                                  FIELD_TYPE_COLORS[f.type] ?? "bg-muted text-muted-foreground"
                                                )}>
                                                  {f.type}{f.isList ? "[]" : ""}
                                                </span>
                                              </td>
                                              <td className="py-1 pe-4">
                                                <div className="flex gap-1 flex-wrap">
                                                  {f.isOptional && (
                                                    <span className="text-muted-foreground">nullable</span>
                                                  )}
                                                  {f.hasDefault && (
                                                    <span className="text-muted-foreground">default</span>
                                                  )}
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                          {relationFields.length > 0 && (
                                            <>
                                              <tr>
                                                <td colSpan={3} className="pt-2 pb-1 text-muted-foreground font-medium uppercase tracking-wide text-xs">
                                                  Relations
                                                </td>
                                              </tr>
                                              {relationFields.map((f) => (
                                                <tr key={f.name} className="border-b border-border/30">
                                                  <td className="py-1 pe-4 font-mono">{f.name}</td>
                                                  <td className="py-1 pe-4">
                                                    <span className="rounded px-1.5 py-0.5 bg-muted text-muted-foreground">
                                                      {f.type}{f.isList ? "[]" : ""}
                                                    </span>
                                                  </td>
                                                  <td className="py-1 pe-4 text-muted-foreground">
                                                    {f.isOptional ? "optional" : "required"}
                                                  </td>
                                                </tr>
                                              ))}
                                            </>
                                          )}
                                        </tbody>
                                      </table>
                                    );
                                  })()}
                                </div>
                              )}

                              {/* Relations tab */}
                              {expandedModelTab === "relations" && (
                                m.relations && m.relations.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {m.relations.map((rel) => (
                                      <div
                                        key={rel.field}
                                        className="flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs"
                                      >
                                        <span className="text-muted-foreground font-mono">{rel.field}</span>
                                        <span className="text-muted-foreground/40">→</span>
                                        {rel.referencedAdminHref ? (
                                          <Link
                                            href={rel.referencedAdminHref}
                                            className="text-primary hover:underline font-medium"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {rel.referencedModel}
                                          </Link>
                                        ) : (
                                          <button
                                            type="button"
                                            className="font-medium hover:text-primary"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const refVisible = visibleSchema.some(
                                                (s) => s.name === rel.referencedModel
                                              );
                                              if (refVisible) {
                                                setExpandedModel(rel.referencedModel);
                                                setExpandedModelTab("fields");
                                                loadModelFields(rel.referencedModel);
                                              }
                                            }}
                                          >
                                            {rel.referencedModel}
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">No outgoing relations.</p>
                                )
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Diagnostics                                                         */}
      {/* ------------------------------------------------------------------ */}

      {tab === "diagnostics" && (
        <div className="space-y-4">
          {/* Header + run button */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-semibold">Platform diagnostics</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {DIAGNOSTIC_CHECKS_CATALOG.length} registered checks across integrity, content, media, and config.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {diagnosticReport && (
                <span className="text-xs text-muted-foreground">
                  Last run {new Date(diagnosticReport.ranAt).toLocaleTimeString()} · {diagnosticReport.durationMs}ms
                </span>
              )}
              <Button
                type="button"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      const report = await runDiagnosticsAction();
                      setDiagnosticReport(report as DiagnosticReport);
                      setExpandedCheck(null);
                    } catch (e) {
                      showToast(e instanceof Error ? e.message : "Diagnostics failed", "error");
                    }
                  });
                }}
              >
                {pending ? "Running…" : diagnosticReport ? "Re-run all" : "Run all diagnostics"}
              </Button>
            </div>
          </div>

          {/* Summary bar */}
          {diagnosticReport && (
            <div className="flex flex-wrap gap-3 rounded-md border px-4 py-3">
              {[
                { label: "Pass", key: "pass", color: "text-green-700" },
                { label: "Warn", key: "warn", color: "text-amber-700" },
                { label: "Fail", key: "fail", color: "text-red-700" },
                { label: "Skipped", key: "skipped", color: "text-muted-foreground" },
              ].map(({ label, key, color }) => (
                <div key={key} className={cn("text-sm", color)}>
                  <span className="font-semibold">
                    {diagnosticReport.summary[key as keyof typeof diagnosticReport.summary]}
                  </span>
                  <span className="ms-1 opacity-70">{label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Check list */}
          <div className="space-y-2">
            {DIAGNOSTIC_CHECKS_CATALOG.map((check) => {
              const result = diagnosticReport?.results.find((r) => r.checkId === check.id);
              const isExpanded = expandedCheck === check.id;
              const statusColor = result ? STATUS_COLORS[result.status] : "bg-muted text-muted-foreground";

              return (
                <div
                  key={check.id}
                  className="rounded-md border overflow-hidden"
                >
                  <button
                    type="button"
                    className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                    onClick={() => setExpandedCheck(isExpanded ? null : check.id)}
                  >
                    <span className="text-sm opacity-60">{isExpanded ? "▼" : "▶"}</span>
                    <span className="flex-1">
                      <span className="font-medium text-sm">{SEVERITY_LABEL[check.severity]} {check.title}</span>
                      <span className="text-xs text-muted-foreground ms-2 capitalize">{check.category}</span>
                    </span>
                    {result ? (
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", statusColor)}>
                        {result.status === "pass" ? "Pass" : result.status === "warn" ? `Warn · ${result.count}` : result.status === "fail" ? `Fail · ${result.count}` : "Skipped"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not run</span>
                    )}
                  </button>
                  {isExpanded && (
                    <div className="border-t px-4 py-3 bg-muted/20 space-y-2">
                      <p className="text-xs text-muted-foreground">{check.description}</p>
                      {result && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">{result.message}</p>
                          {result.items && result.items.length > 0 && (
                            <ul className="space-y-1">
                              {result.items.map((item) => (
                                <li key={item.id} className="text-xs flex items-center gap-2">
                                  <span className="text-muted-foreground font-mono">{item.id.slice(0, 8)}…</span>
                                  <span>{item.label}</span>
                                  {item.href && (
                                    <Link href={item.href} className="text-primary hover:underline">
                                      Open →
                                    </Link>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                          {check.id === "stale-form-submissions" && result.status === "warn" && (result.count ?? 0) > 0 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={pending}
                              onClick={() => {
                                startTransition(async () => {
                                  try {
                                    const res = await markStaleFormSubmissionsAction();
                                    showToast(`Marked ${res.updated} submission${res.updated !== 1 ? "s" : ""} as CONTACTED.`, "success");
                                    setDiagnosticReport(null);
                                  } catch (e) {
                                    showToast(e instanceof Error ? e.message : "Action failed", "error");
                                  }
                                });
                              }}
                            >
                              Mark as reviewed
                            </Button>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Ran in {result.durationMs}ms
                          </p>
                        </div>
                      )}
                      {!result && (
                        <p className="text-xs text-muted-foreground italic">
                          Click &ldquo;Run all diagnostics&rdquo; above to execute this check.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Operations                                                          */}
      {/* ------------------------------------------------------------------ */}

      {tab === "operations" && (
        <div className="space-y-6 max-w-3xl">

          {/* Backup & Restore */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Backup &amp; Restore</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Namespace</Label>
                <select
                  value={opNamespace}
                  onChange={(e) => setOpNamespace(e.target.value)}
                  className="w-full border rounded-md h-10 px-3 text-sm"
                >
                  {jsonSources.map((src) => (
                    <option key={src.namespace} value={src.namespace!}>
                      {src.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        const data = await exportJsonNamespaceAction(opNamespace);
                        setExportData(JSON.stringify(data, null, 2));
                        showToast("Namespace exported", "success");
                      } catch (e) {
                        showToast(e instanceof Error ? e.message : "Export failed", "error");
                      }
                    });
                  }}
                >
                  Export namespace
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        const blob = await backupJsonStoreAction();
                        const url = URL.createObjectURL(
                          new Blob([blob], { type: "application/json" })
                        );
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `azura-backup-${Date.now()}.json`;
                        a.click();
                        showToast("Backup downloaded", "success");
                      } catch (e) {
                        showToast(e instanceof Error ? e.message : "Backup failed", "error");
                      }
                    });
                  }}
                >
                  Download full backup
                </Button>
              </div>
              {exportData && (
                <Textarea value={exportData} readOnly rows={5} className="font-mono text-xs" />
              )}
              <Label>Import namespace JSON</Label>
              <Textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                rows={5}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                disabled={pending || !importData}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await importJsonNamespaceAction(opNamespace, importData);
                      setImportData("");
                      showToast("Namespace imported", "success");
                    } catch (e) {
                      showToast(e instanceof Error ? e.message : "Import failed", "error");
                    }
                  });
                }}
              >
                Import namespace
              </Button>
              <Label>Restore full backup (replaces whitelisted namespaces)</Label>
              <Textarea
                value={restoreData}
                onChange={(e) => setRestoreData(e.target.value)}
                rows={6}
                className="font-mono text-xs"
                placeholder='{"version":1,"records":[...]}'
              />
              <Button
                type="button"
                variant="destructive"
                disabled={pending || !restoreData}
                onClick={() => setShowRestoreConfirm(true)}
              >
                Restore backup
              </Button>
            </CardContent>
          </Card>

          {/* Cache management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cache management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Clear all keys in a JSON cache namespace. Non-cache namespaces (theme, settings, SEO)
                cannot be bulk-cleared here.
              </p>
              {cacheNamespaces.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No cache namespaces configured.</p>
              ) : (
                <div className="space-y-2">
                  {cacheNamespaces.map((src) => (
                    <div key={src.namespace} className="flex items-center justify-between border rounded-md px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{src.displayName}</p>
                        <p className="text-xs text-muted-foreground">{src.namespace}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => setClearTarget(src.namespace!)}
                      >
                        Clear
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revalidate + Platform report */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">System utilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        const res = await revalidateAdminPathsAction();
                        showToast(`Revalidated ${res.revalidated} paths`, "success");
                      } catch (e) {
                        showToast(e instanceof Error ? e.message : "Revalidation failed", "error");
                      }
                    });
                  }}
                >
                  Revalidate admin paths
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        const data = await exportPlatformReportAction();
                        setReportData(data);
                        showToast("Report generated", "success");
                      } catch (e) {
                        showToast(e instanceof Error ? e.message : "Report export failed", "error");
                      }
                    });
                  }}
                >
                  Generate platform report
                </Button>
                {reportData && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const url = URL.createObjectURL(
                        new Blob([reportData], { type: "application/json" })
                      );
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `azura-platform-report-${Date.now()}.json`;
                      a.click();
                    }}
                  >
                    Download report
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>Revalidate admin paths</strong> flushes the Next.js server cache for all main
                admin routes and the public home page.
                <br />
                <strong>Generate platform report</strong> runs an overview snapshot + all diagnostics
                and exports them as a downloadable JSON file.
              </p>
              {reportData && (
                <Textarea value={reportData} readOnly rows={10} className="font-mono text-xs" />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Delete confirm dialog                                               */}
      {/* ------------------------------------------------------------------ */}

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete record</DialogTitle>
            <DialogDescription>
              Delete <strong>{deleteTarget}</strong> from the <strong>{namespace}</strong> namespace?
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                const key = deleteTarget!;
                startTransition(async () => {
                  try {
                    await deleteJsonRecordAction(namespace, key);
                    setDeleteTarget(null);
                    setSelectedKey(null);
                    setEditorJson("");
                    await loadJsonNamespace(namespace);
                    showToast(`Deleted "${key}"`, "success");
                  } catch (e) {
                    setDeleteTarget(null);
                    showToast(e instanceof Error ? e.message : "Delete failed", "error");
                  }
                });
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Restore confirm dialog                                              */}
      {/* ------------------------------------------------------------------ */}

      <Dialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore backup</DialogTitle>
            <DialogDescription>
              This will overwrite all JSON store keys included in the backup for whitelisted
              namespaces. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreConfirm(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    const result = await restoreJsonStoreAction(restoreData);
                    setShowRestoreConfirm(false);
                    setRestoreData("");
                    showToast(`Restored ${result.restored} records`, "success");
                  } catch (e) {
                    setShowRestoreConfirm(false);
                    showToast(e instanceof Error ? e.message : "Restore failed", "error");
                  }
                });
              }}
            >
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Clear namespace confirm dialog                                      */}
      {/* ------------------------------------------------------------------ */}

      <Dialog open={clearTarget !== null} onOpenChange={(open) => { if (!open) setClearTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear cache namespace</DialogTitle>
            <DialogDescription>
              Delete all records in <strong>{clearTarget}</strong>? This will flush the cache for this
              namespace. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                const ns = clearTarget!;
                startTransition(async () => {
                  try {
                    const result = await clearJsonNamespaceAction(ns);
                    setClearTarget(null);
                    showToast(`Cleared ${result.cleared} records from "${ns}"`, "success");
                  } catch (e) {
                    setClearTarget(null);
                    showToast(e instanceof Error ? e.message : "Clear failed", "error");
                  }
                });
              }}
            >
              Clear namespace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Toast                                                               */}
      {/* ------------------------------------------------------------------ */}

      {toast && (
        <div
          role="status"
          className={cn(
            "fixed bottom-6 right-6 z-[100] rounded-lg border px-4 py-3 text-sm shadow-lg animate-in slide-in-from-bottom-4 fade-in",
            toast.type === "success"
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
