"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { LocaleConfig } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import {
  exportMergedMessagesAction,
  importUiMessagesJsonAction,
  upsertUiMessageAction,
} from "@/features/translation/actions";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type MessageKey = {
  namespace: string;
  key: string;
  fullKey: string;
  englishValue: string;
};

type DbRow = {
  namespace: string;
  key: string;
  values: Record<string, { value: string }>;
};

type Props = {
  locales: LocaleConfig[];
  enabledLocales: PublicLocale[];
  messageKeys: MessageKey[];
  dbRows: DbRow[];
  fileMessagesByLocale: Record<string, Record<string, string>>;
};

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (!current || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : "";
}

export function UiMessagesAdmin({
  locales,
  enabledLocales,
  messageKeys,
  dbRows,
  fileMessagesByLocale,
}: Props) {
  const adminForm = useAdminFormOptional();
  const [namespaceFilter, setNamespaceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [localOverrides, setLocalOverrides] = useState<Record<string, string>>({});
  const importRef = useRef<HTMLInputElement>(null);
  const [importLocale, setImportLocale] = useState(enabledLocales[0]?.code ?? "en");

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

  const filteredKeys = useMemo(() => {
    return messageKeys.filter((k) => {
      if (namespaceFilter !== "all" && k.namespace !== namespaceFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return k.fullKey.toLowerCase().includes(q) || k.englishValue.toLowerCase().includes(q);
      }
      return true;
    });
  }, [messageKeys, namespaceFilter, search]);

  const getCellValue = (fullKey: string, localeCode: string, namespace: string, key: string) => {
    const overrideKey = `${namespace}:${key}:${localeCode}`;
    if (localOverrides[overrideKey] !== undefined) return localOverrides[overrideKey];

    const db = dbMap.get(`${namespace}:${key}`);
    if (db?.values[localeCode]?.value) return db.values[localeCode].value;

    const fileFlat = fileMessagesByLocale[localeCode];
    if (fileFlat?.[fullKey]) return fileFlat[fullKey];

    return "";
  };

  const isMissing = (fullKey: string, localeCode: string, englishValue: string) => {
    if (!englishValue.trim() || localeCode === "en") return false;
    return !getCellValue(fullKey, localeCode, fullKey.includes(".") ? "root" : "root", fullKey).trim();
  };

  const saveCell = (namespace: string, key: string, languageCode: string, value: string) => {
    startTransition(async () => {
      try {
        await upsertUiMessageAction(namespace, key, languageCode, value);
        adminForm?.showToast("Message saved", "success");
      } catch {
        adminForm?.showToast("Failed to save message", "error");
      }
    });
  };

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
          adminForm?.showToast(`Imported ${count.count} messages`, "success");
        } catch {
          adminForm?.showToast("Import failed", "error");
        }
      });
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">UI Messages</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Grid editor for messages/*.json overrides per language. Empty cells use file fallback (placeholder).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters & import/export</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2 w-48">
            <Label>Namespace</Label>
            <select
              className="w-full border rounded-md h-10 px-3 bg-background text-sm"
              value={namespaceFilter}
              onChange={(e) => setNamespaceFilter(e.target.value)}
            >
              {namespaces.map((ns) => (
                <option key={ns} value={ns}>
                  {ns === "all" ? "All namespaces" : ns}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 flex-1 min-w-[200px]">
            <Label>Search</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Key or English value…" />
          </div>
          <div className="flex flex-wrap gap-2">
            {enabledLocales.map((l) => (
              <Button key={l.code} type="button" variant="outline" size="sm" disabled={pending} onClick={() => handleExport(l.code)}>
                <Download className="h-3.5 w-3.5 me-1" />
                Export {l.code}.json
              </Button>
            ))}
            <select
              className="border rounded-md h-9 px-2 text-sm bg-background"
              value={importLocale}
              onChange={(e) => setImportLocale(e.target.value)}
            >
              {enabledLocales.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <Button type="button" variant="outline" size="sm" onClick={() => importRef.current?.click()}>
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

      <Card>
        <CardHeader>
          <CardTitle>Message grid</CardTitle>
          <CardDescription>{filteredKeys.length} keys · highlighted cells are missing translations</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="p-2 text-left font-medium w-64">Key</th>
                  <th className="p-2 text-left font-medium min-w-[180px]">English</th>
                  {enabledLocales.map((l) => (
                    <th key={l.code} className="p-2 text-left font-medium min-w-[160px]">
                      {l.flag} {l.code.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredKeys.map((mk) => (
                  <tr key={mk.fullKey} className="border-t align-top">
                    <td className="p-2 font-mono text-xs text-muted-foreground">{mk.fullKey}</td>
                    <td className="p-2 text-muted-foreground">{mk.englishValue}</td>
                    {enabledLocales.map((l) => {
                      const val = getCellValue(mk.fullKey, l.code, mk.namespace, mk.key);
                      const fileFallback =
                        fileMessagesByLocale[l.code]?.[mk.fullKey] ??
                        getNestedValue(fileMessagesByLocale[l.code] as unknown as Record<string, unknown>, mk.fullKey);
                      const missing =
                        l.code !== "en" &&
                        mk.englishValue.trim() &&
                        !val.trim() &&
                        !String(fileFallback ?? "").trim();

                      return (
                        <td
                          key={l.code}
                          className={cn("p-2", missing && "bg-destructive/5")}
                        >
                          <Input
                            defaultValue={val}
                            placeholder={String(fileFallback ?? "") || "—"}
                            className={cn("text-xs h-8", !val && fileFallback && "text-muted-foreground")}
                            onBlur={(e) => {
                              const next = e.target.value;
                              if (next === val) return;
                              setLocalOverrides((prev) => ({
                                ...prev,
                                [`${mk.namespace}:${mk.key}:${l.code}`]: next,
                              }));
                              saveCell(mk.namespace, mk.key, l.code, next);
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function flattenMessages(
  obj: Record<string, unknown>,
  prefix = "",
  namespace = "root"
): { namespace: string; key: string; fullKey: string; englishValue: string }[] {
  const result: { namespace: string; key: string; fullKey: string; englishValue: string }[] = [];

  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      result.push({ namespace, key: fullKey, fullKey, englishValue: v });
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      result.push(...flattenMessages(v as Record<string, unknown>, fullKey, namespace));
    }
  }

  return result;
}

export { flattenMessages };
