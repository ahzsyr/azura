"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { LocaleConfig, TranslationStatus } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import {
  exportMergedMessagesAction,
  importUiMessagesJsonAction,
  upsertUiMessageAction,
} from "@/features/translation/actions";
import type { UiMessageKey } from "@/features/translation/ui-messages-utils";
import {
  ALL_MESSAGE_ROLES,
  getRoleLabel,
  resolveCellState,
  type StatusFilter,
} from "@/features/translation/ui-message-meta";
import { UiMessageCell } from "@/features/translation/components/ui-message-cell";
import {
  UI_MESSAGE_PAGE_SIZES,
  UiMessagesPagination,
  type UiMessagePageSize,
} from "@/features/translation/components/ui-messages-pagination";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Languages, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "messages", label: "Messages" },
  { id: "import-export", label: "Import / Export" },
  { id: "preferences", label: "View preferences" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const PREFS_STORAGE_KEY = "azura:ui-messages-prefs";

type DbRow = {
  namespace: string;
  key: string;
  values: Record<string, { value: string; status: TranslationStatus }>;
};

type ViewPreferences = {
  pageSize: UiMessagePageSize;
  visibleLocales: Record<string, boolean>;
  density: "compact" | "normal";
};

type PendingEdit = {
  namespace: string;
  key: string;
  languageCode: string;
  value: string;
  status: TranslationStatus;
};

function parseOverrideKey(key: string): { namespace: string; messageKey: string; languageCode: string } | null {
  const parts = key.split(":");
  if (parts.length < 3) return null;
  const languageCode = parts.pop()!;
  const messageKey = parts.pop()!;
  const namespace = parts.join(":");
  return { namespace, messageKey, languageCode };
}

type Props = {
  locales: LocaleConfig[];
  enabledLocales: PublicLocale[];
  messageKeys: UiMessageKey[];
  dbRows: DbRow[];
  fileMessagesByLocale: Record<string, Record<string, string>>;
};

function isValidTab(id: string | null): id is TabId {
  return TABS.some((tab) => tab.id === id);
}

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (!current || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : "";
}

function loadPreferences(enabledLocales: PublicLocale[]): ViewPreferences {
  const defaults: ViewPreferences = {
    pageSize: 20,
    visibleLocales: Object.fromEntries(enabledLocales.map((l) => [l.code, true])),
    density: "normal",
  };

  if (typeof window === "undefined") return defaults;

  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<ViewPreferences>;
    const pageSize =
      parsed.pageSize && UI_MESSAGE_PAGE_SIZES.includes(parsed.pageSize as UiMessagePageSize)
        ? (parsed.pageSize as UiMessagePageSize)
        : defaults.pageSize;
    const visibleLocales = { ...defaults.visibleLocales, ...(parsed.visibleLocales ?? {}) };
    const density = parsed.density === "compact" ? "compact" : "normal";
    return { pageSize, visibleLocales, density };
  } catch {
    return defaults;
  }
}

function savePreferences(prefs: ViewPreferences) {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota errors
  }
}

function LegendSwatch({ label, className }: { label: string; className: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("h-4 w-4 rounded border shrink-0", className)} aria-hidden />
      {label}
    </span>
  );
}

export function UiMessagesAdmin({
  locales: _locales,
  enabledLocales,
  messageKeys,
  dbRows,
  fileMessagesByLocale,
}: Props) {
  const router = useRouter();
  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = useMemo(() => (isValidTab(tabParam) ? tabParam : "messages"), [tabParam]);

  const [namespaceFilter, setNamespaceFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pending, startTransition] = useTransition();
  const [localOverrides, setLocalOverrides] = useState<
    Record<string, { value: string; status: TranslationStatus }>
  >({});
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [importLocale, setImportLocale] = useState(enabledLocales[0]?.code ?? "en");
  const [prefs, setPrefs] = useState<ViewPreferences>(() => loadPreferences(enabledLocales));

  useEffect(() => {
    savePreferences(prefs);
  }, [prefs]);

  const handleTabChange = useCallback(
    (tabId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tabId === "messages") {
        params.delete("tab");
      } else {
        params.set("tab", tabId);
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  const dbMap = useMemo(() => {
    const map = new Map<string, DbRow>();
    for (const row of dbRows) {
      map.set(`${row.namespace}:${row.key}`, row);
    }
    return map;
  }, [dbRows]);

  const namespaces = useMemo(() => {
    const set = new Set(messageKeys.map((k) => k.namespace));
    return ["all", ...Array.from(set).sort()];
  }, [messageKeys]);

  const groups = useMemo(() => {
    const set = new Set(messageKeys.map((k) => k.group));
    return ["all", ...Array.from(set).sort()];
  }, [messageKeys]);

  const visibleLocales = useMemo(
    () => enabledLocales.filter((l) => prefs.visibleLocales[l.code] !== false),
    [enabledLocales, prefs.visibleLocales],
  );

  const getFileFallback = useCallback(
    (fullKey: string, localeCode: string) => {
      const flat = fileMessagesByLocale[localeCode]?.[fullKey];
      if (flat) return flat;
      return getNestedValue(
        fileMessagesByLocale[localeCode] as unknown as Record<string, unknown>,
        fullKey,
      );
    },
    [fileMessagesByLocale],
  );

  const getCellData = useCallback(
    (namespace: string, key: string, fullKey: string, localeCode: string) => {
      const overrideKey = `${namespace}:${key}:${localeCode}`;
      const override = localOverrides[overrideKey];
      const db = dbMap.get(`${namespace}:${key}`);
      const dbEntry = db?.values[localeCode];

      const value = override?.value ?? dbEntry?.value ?? "";
      const status = override?.status ?? dbEntry?.status ?? "PUBLISHED";
      const fileFallback = getFileFallback(fullKey, localeCode);

      return { value, status, fileFallback };
    },
    [dbMap, getFileFallback, localOverrides],
  );

  const rowMatchesStatus = useCallback(
    (mk: UiMessageKey, filter: StatusFilter) => {
      if (filter === "all") return true;

      for (const locale of enabledLocales) {
        const { value, status, fileFallback } = getCellData(
          mk.namespace,
          mk.key,
          mk.fullKey,
          locale.code,
        );
        const cellState = resolveCellState({
          localeCode: locale.code,
          englishValue: mk.englishValue,
          dbValue: value,
          dbStatus: status,
          fileFallback,
        });

        if (filter === "missing" && cellState === "missing") return true;
        if (filter === "draft" && cellState === "draft") return true;
        if (filter === "published" && cellState === "published-override") return true;
      }
      return false;
    },
    [enabledLocales, getCellData],
  );

  const filteredKeys = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messageKeys.filter((k) => {
      if (namespaceFilter !== "all" && k.namespace !== namespaceFilter) return false;
      if (groupFilter !== "all" && k.group !== groupFilter) return false;
      if (roleFilter !== "all" && k.role !== roleFilter) return false;
      if (!rowMatchesStatus(k, statusFilter)) return false;
      if (q) {
        if (k.fullKey.toLowerCase().includes(q) || k.englishValue.toLowerCase().includes(q)) {
          return true;
        }
        for (const locale of visibleLocales) {
          const { value, fileFallback } = getCellData(
            k.namespace,
            k.key,
            k.fullKey,
            locale.code,
          );
          if (value.toLowerCase().includes(q) || String(fileFallback).toLowerCase().includes(q)) {
            return true;
          }
        }
        return false;
      }
      return true;
    });
  }, [
    messageKeys,
    namespaceFilter,
    groupFilter,
    roleFilter,
    statusFilter,
    search,
    rowMatchesStatus,
    visibleLocales,
    getCellData,
  ]);

  useEffect(() => {
    setPage(1);
  }, [namespaceFilter, groupFilter, roleFilter, statusFilter, search, prefs.pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredKeys.length / prefs.pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginatedKeys = useMemo(() => {
    const start = (safePage - 1) * prefs.pageSize;
    return filteredKeys.slice(start, start + prefs.pageSize);
  }, [filteredKeys, safePage, prefs.pageSize]);

  const handleCellChange = useCallback(
    (
      namespace: string,
      key: string,
      languageCode: string,
      nextValue: string,
      nextStatus: TranslationStatus,
    ) => {
      const overrideKey = `${namespace}:${key}:${languageCode}`;
      const db = dbMap.get(`${namespace}:${key}`);
      const dbEntry = db?.values[languageCode];
      const savedValue = dbEntry?.value ?? "";
      const savedStatus = dbEntry?.status ?? "PUBLISHED";

      setLocalOverrides((prev) => {
        const next = { ...prev };
        if (nextValue === savedValue && nextStatus === savedStatus) {
          delete next[overrideKey];
        } else {
          next[overrideKey] = { value: nextValue, status: nextStatus };
        }
        return next;
      });
      markUnsaved();
      setSaveFeedback(null);
      setSaveError(null);
    },
    [dbMap, markUnsaved],
  );

  const handleSave = useCallback(async () => {
    const edits: PendingEdit[] = [];
    for (const [overrideKey, edit] of Object.entries(localOverrides)) {
      const parsed = parseOverrideKey(overrideKey);
      if (!parsed) continue;
      edits.push({
        namespace: parsed.namespace,
        key: parsed.messageKey,
        languageCode: parsed.languageCode,
        value: edit.value,
        status: edit.status,
      });
    }

    if (edits.length === 0) {
      markSaved();
      return true;
    }

    setSaveError(null);
    setSaveFeedback(null);
    setSaveStatus("saving");

    try {
      await Promise.all(
        edits.map((edit) =>
          upsertUiMessageAction(
            edit.namespace,
            edit.key,
            edit.languageCode,
            edit.value,
            edit.status,
          ),
        ),
      );
      setLocalOverrides({});
      setSaveFeedback(`Saved ${edits.length} message${edits.length === 1 ? "" : "s"}.`);
      markSaved();
      router.refresh();
      return true;
    } catch {
      setSaveError("Failed to save messages.");
      setSaveStatus("error");
      return false;
    }
  }, [localOverrides, markSaved, router, setSaveStatus]);

  const handleCancel = useCallback(() => {
    setLocalOverrides({});
    setSaveFeedback(null);
    setSaveError(null);
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (activeTab !== "messages") {
      clearPageActions();
      return;
    }
    registerPageActions({
      onSave: handleSave,
      onCancel: handleCancel,
      selfManagedSaveStatus: true,
    });
    return () => clearPageActions();
  }, [
    activeTab,
    registerPageActions,
    clearPageActions,
    handleSave,
    handleCancel,
  ]);

  const handleExport = (code: string) => {
    startTransition(async () => {
      const json = await exportMergedMessagesAction(code);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${code}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      startTransition(async () => {
        try {
          const count = await importUiMessagesJsonAction(importLocale, String(reader.result));
          setSaveFeedback(`Imported ${count.count} messages.`);
          router.refresh();
        } catch {
          setSaveError("Import failed.");
        }
      });
    };
    reader.readAsText(file);
  };

  const rowPadding = prefs.density === "compact" ? "p-1.5" : "p-2";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="UI Messages"
        description="Grid editor for messages/*.json overrides per language. Empty cells use file fallback (placeholder)."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/translations">
              <Languages className="h-3.5 w-3.5 me-1" />
              Translations dashboard
            </Link>
          </Button>
        }
      />

      {saveFeedback ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          {saveFeedback}
        </p>
      ) : null}
      {saveError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {saveError}
        </p>
      ) : null}

      <AdminSettingsLayout tabs={[...TABS]} activeTab={activeTab} onTabChange={handleTabChange}>
        {(tab) => {
          if (tab === "import-export") {
            return (
              <Card>
                <CardHeader>
                  <CardTitle>Import / Export</CardTitle>
                  <CardDescription>
                    Export merged file + database messages, or import a JSON file for one locale.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4 items-end">
                  <div className="flex flex-wrap gap-2">
                    {enabledLocales.map((l) => (
                      <Button
                        key={l.code}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => handleExport(l.code)}
                      >
                        <Download className="h-3.5 w-3.5 me-1" />
                        Export {l.code}.json
                      </Button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-2">
                      <Label>Import locale</Label>
                      <select
                        className="border rounded-md h-10 px-3 text-sm bg-background block"
                        value={importLocale}
                        onChange={(e) => setImportLocale(e.target.value)}
                      >
                        {enabledLocales.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10"
                      onClick={() => importRef.current?.click()}
                    >
                      <Upload className="h-3.5 w-3.5 me-1" />
                      Import .json
                    </Button>
                    <input
                      ref={importRef}
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImport(file);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          }

          if (tab === "preferences") {
            return (
              <Card>
                <CardHeader>
                  <CardTitle>View preferences</CardTitle>
                  <CardDescription>
                    Saved in your browser. Controls pagination and visible locale columns.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2 max-w-xs">
                    <Label>Page size</Label>
                    <select
                      className="w-full border rounded-md h-10 px-3 bg-background text-sm"
                      value={prefs.pageSize}
                      onChange={(e) =>
                        setPrefs((p) => ({
                          ...p,
                          pageSize: Number(e.target.value) as UiMessagePageSize,
                        }))
                      }
                    >
                      {UI_MESSAGE_PAGE_SIZES.map((s) => (
                        <option key={s} value={s}>
                          {s} rows
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 max-w-xs">
                    <Label>Row density</Label>
                    <select
                      className="w-full border rounded-md h-10 px-3 bg-background text-sm"
                      value={prefs.density}
                      onChange={(e) =>
                        setPrefs((p) => ({
                          ...p,
                          density: e.target.value as ViewPreferences["density"],
                        }))
                      }
                    >
                      <option value="normal">Normal</option>
                      <option value="compact">Compact</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <Label>Visible locale columns</Label>
                    <div className="flex flex-wrap gap-3">
                      {enabledLocales.map((l) => (
                        <label key={l.code} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={prefs.visibleLocales[l.code] !== false}
                            onChange={(e) =>
                              setPrefs((p) => ({
                                ...p,
                                visibleLocales: {
                                  ...p.visibleLocales,
                                  [l.code]: e.target.checked,
                                },
                              }))
                            }
                          />
                          {l.flag} {l.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }

          return (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4 items-end">
                  <FilterSelect
                    label="Namespace"
                    value={namespaceFilter}
                    onChange={setNamespaceFilter}
                    options={namespaces.map((ns) => ({
                      value: ns,
                      label: ns === "all" ? "All namespaces" : ns,
                    }))}
                  />
                  <FilterSelect
                    label="Group"
                    value={groupFilter}
                    onChange={setGroupFilter}
                    options={groups.map((g) => ({
                      value: g,
                      label: g === "all" ? "All groups" : g,
                    }))}
                  />
                  <FilterSelect
                    label="Role"
                    value={roleFilter}
                    onChange={setRoleFilter}
                    options={[
                      { value: "all", label: "All roles" },
                      ...ALL_MESSAGE_ROLES.map((r) => ({
                        value: r,
                        label: getRoleLabel(r),
                      })),
                    ]}
                  />
                  <FilterSelect
                    label="Status"
                    value={statusFilter}
                    onChange={(v) => setStatusFilter(v as StatusFilter)}
                    options={[
                      { value: "all", label: "All statuses" },
                      { value: "missing", label: "Missing" },
                      { value: "draft", label: "Draft" },
                      { value: "published", label: "Published override" },
                    ]}
                  />
                  <div className="space-y-2 flex-1 min-w-[200px]">
                    <Label>Search</Label>
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Key, English, or locale value…"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="space-y-3">
                  <div>
                    <CardTitle>Message grid</CardTitle>
                    <CardDescription>
                      {filteredKeys.length} keys · page {safePage} of {totalPages}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <LegendSwatch label="Missing" className="bg-destructive/5" />
                    <LegendSwatch label="Draft" className="bg-amber-500/5" />
                    <LegendSwatch label="Published override" className="bg-primary/5" />
                    <LegendSwatch
                      label="File fallback"
                      className="border-dashed border-muted-foreground/20 bg-background"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="w-full">
                    <table className="w-full text-sm min-w-[800px]">
                      <thead className="bg-muted/50 sticky top-0 z-10">
                        <tr>
                          <th className={cn(rowPadding, "text-left font-medium w-64")}>Key</th>
                          <th className={cn(rowPadding, "text-left font-medium w-20")}>Role</th>
                          <th className={cn(rowPadding, "text-left font-medium min-w-[180px]")}>
                            English
                          </th>
                          {visibleLocales.map((l) => (
                            <th
                              key={l.code}
                              className={cn(rowPadding, "text-left font-medium min-w-[180px]")}
                            >
                              {l.flag} {l.code.toUpperCase()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedKeys.map((mk) => (
                          <tr key={mk.fullKey} className="border-t align-top">
                            <td className={cn(rowPadding, "font-mono text-xs text-muted-foreground")}>
                              {mk.fullKey}
                            </td>
                            <td className={rowPadding}>
                              <Badge variant="outline" className="text-[10px] font-normal">
                                {getRoleLabel(mk.role)}
                              </Badge>
                            </td>
                            <td className={cn(rowPadding, "text-muted-foreground")}>
                              {mk.englishValue}
                            </td>
                            {visibleLocales.map((l) => {
                              const { value, status, fileFallback } = getCellData(
                                mk.namespace,
                                mk.key,
                                mk.fullKey,
                                l.code,
                              );

                              return (
                                <td key={l.code} className={rowPadding}>
                                  <UiMessageCell
                                    namespace={mk.namespace}
                                    messageKey={mk.key}
                                    fullKey={mk.fullKey}
                                    role={mk.role}
                                    localeCode={l.code}
                                    englishValue={mk.englishValue}
                                    value={value}
                                    fileFallback={String(fileFallback ?? "")}
                                    status={status}
                                    density={prefs.density}
                                    disabled={pending}
                                    onChange={(next, nextStatus) =>
                                      handleCellChange(
                                        mk.namespace,
                                        mk.key,
                                        l.code,
                                        next,
                                        nextStatus,
                                      )
                                    }
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        {paginatedKeys.length === 0 && (
                          <tr>
                            <td
                              colSpan={3 + visibleLocales.length}
                              className="p-8 text-center text-muted-foreground"
                            >
                              No messages match the current filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </ScrollArea>
                  <UiMessagesPagination
                    page={safePage}
                    pageSize={prefs.pageSize}
                    totalRows={filteredKeys.length}
                    onPage={setPage}
                    onPageSize={(pageSize) => setPrefs((p) => ({ ...p, pageSize }))}
                  />
                </CardContent>
              </Card>
            </>
          );
        }}
      </AdminSettingsLayout>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2 w-44">
      <Label>{label}</Label>
      <select
        className="w-full border rounded-md h-10 px-3 bg-background text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
