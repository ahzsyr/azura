"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import {
  backupJsonStore,
  deleteJsonRecordAction,
  exportJsonNamespace,
  getRelationalRecordAction,
  importJsonNamespace,
  listJsonRecordsAction,
  listRelationalRecordsAction,
  restoreJsonStore,
  upsertJsonRecordAction,
} from "@/features/storage/actions";
import {
  JSON_NAMESPACES,
  BROWSABLE_TABLES,
  type BrowsableTableKey,
  type JsonNamespace,
} from "@/features/storage/constants";
import type { DatabaseOverview, SchemaModelInfo } from "@/features/storage/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type JsonRow = {
  id: string;
  namespace: string;
  key: string;
  data: unknown;
  version: number;
  updatedAt: string | Date;
};

type Props = {
  overview: DatabaseOverview;
  schema: SchemaModelInfo[];
};

type Tab = "overview" | "json" | "relational" | "schema" | "backup";

export function DatabaseManager({ overview, schema }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [namespace, setNamespace] = useState<JsonNamespace>("settings");
  const [jsonRows, setJsonRows] = useState<JsonRow[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editorJson, setEditorJson] = useState("");
  const [newKey, setNewKey] = useState("");
  const [exportData, setExportData] = useState("");
  const [importData, setImportData] = useState("");
  const [restoreData, setRestoreData] = useState("");
  const [relationalTable, setRelationalTable] = useState<BrowsableTableKey>("FaqItem");
  const [relationalItems, setRelationalItems] = useState<unknown[]>([]);
  const [relationalTotal, setRelationalTotal] = useState(0);
  const [relationalPage, setRelationalPage] = useState(1);
  const [relationalDetail, setRelationalDetail] = useState("");
  const [pending, startTransition] = useTransition();

  const loadJsonNamespace = useCallback((ns: JsonNamespace) => {
    startTransition(async () => {
      const rows = await listJsonRecordsAction(ns);
      setJsonRows(
        rows.map((r) => ({
          ...r,
          updatedAt: r.updatedAt,
        }))
      );
      setSelectedKey(null);
      setEditorJson("");
    });
  }, []);

  const loadRelational = useCallback((table: BrowsableTableKey, page: number) => {
    startTransition(async () => {
      const result = await listRelationalRecordsAction(table, page);
      setRelationalItems(result.items);
      setRelationalTotal(result.total);
      setRelationalPage(page);
      setRelationalDetail("");
    });
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "json", label: "JSON store" },
    { id: "relational", label: "Browse SQL" },
    { id: "schema", label: "Schema" },
    { id: "backup", label: "Backup / restore" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              if (t.id === "json") loadJsonNamespace(namespace);
              if (t.id === "relational") loadRelational(relationalTable, 1);
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

      {tab === "overview" && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hybrid storage</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              <p>
                <strong className="text-foreground">MySQL + Prisma</strong> — packages, CMS, users,
                inquiries, media (relations preserved).
              </p>
              <p>
                <strong className="text-foreground">JSON store</strong> — theme presets, builder
                templates, page cache, settings, SEO config.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">JSON entries</CardTitle>
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
      )}

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
                  const ns = e.target.value as JsonNamespace;
                  setNamespace(ns);
                  loadJsonNamespace(ns);
                }}
                className="w-full border rounded-md h-10 px-3 text-sm"
              >
                {(Object.keys(JSON_NAMESPACES) as JsonNamespace[]).map((ns) => (
                  <option key={ns} value={ns}>
                    {JSON_NAMESPACES[ns].label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {JSON_NAMESPACES[namespace].description}
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
                  <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="record-key" />
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
                      await upsertJsonRecordAction(namespace, key, editorJson);
                      loadJsonNamespace(namespace);
                      setNewKey("");
                      alert("Saved");
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
                    onClick={() => {
                      if (!confirm(`Delete ${selectedKey}?`)) return;
                      startTransition(async () => {
                        await deleteJsonRecordAction(namespace, selectedKey);
                        loadJsonNamespace(namespace);
                      });
                    }}
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

      {tab === "relational" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Read-only browse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Relational data with FKs stays in MySQL. Edit via dedicated admin screens.
              </p>
              <select
                value={relationalTable}
                onChange={(e) => {
                  const t = e.target.value as BrowsableTableKey;
                  setRelationalTable(t);
                  loadRelational(t, 1);
                }}
                className="w-full border rounded-md h-10 px-3"
              >
                {(Object.keys(BROWSABLE_TABLES) as BrowsableTableKey[]).map((k) => (
                  <option key={k} value={k}>
                    {BROWSABLE_TABLES[k].label}
                  </option>
                ))}
              </select>
              <Link
                href={BROWSABLE_TABLES[relationalTable].adminHref}
                className="text-sm text-primary hover:underline"
              >
                Open in admin →
              </Link>
              <ul className="text-sm border rounded-md divide-y max-h-80 overflow-y-auto">
                {relationalItems.map((item) => {
                  const row = item as { id: string };
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted font-mono text-xs"
                        onClick={() => {
                          startTransition(async () => {
                            const record = await getRelationalRecordAction(relationalTable, row.id);
                            setRelationalDetail(JSON.stringify(record, null, 2));
                          });
                        }}
                      >
                        {row.id}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center gap-2 text-sm">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={relationalPage <= 1 || pending}
                  onClick={() => loadRelational(relationalTable, relationalPage - 1)}
                >
                  Prev
                </Button>
                <span className="text-muted-foreground">
                  Page {relationalPage} · {relationalTotal} total
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={relationalPage * 25 >= relationalTotal || pending}
                  onClick={() => loadRelational(relationalTable, relationalPage + 1)}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Record JSON</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                readOnly
                value={relationalDetail}
                rows={20}
                className="font-mono text-xs"
                placeholder="Select a record"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "schema" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schema inspector</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pe-4">Model</th>
                    <th className="py-2 pe-4">Storage</th>
                    <th className="py-2 pe-4">Rows</th>
                    <th className="py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {schema.map((m) => (
                    <tr key={m.name} className="border-b border-border/50">
                      <td className="py-2 font-medium">{m.name}</td>
                      <td className="py-2">
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-xs",
                            m.kind === "json" ? "bg-amber-100 text-amber-900" : "bg-blue-100 text-blue-900"
                          )}
                        >
                          {m.kind === "json" ? "JSON" : "MySQL"}
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground">{m.count ?? "—"}</td>
                      <td className="py-2 text-muted-foreground text-xs">{m.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "backup" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import / export / backup / restore</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-w-3xl">
            <div className="space-y-2">
              <Label>Namespace</Label>
              <Input value={namespace} onChange={(e) => setNamespace(e.target.value as JsonNamespace)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const data = await exportJsonNamespace(namespace);
                  setExportData(JSON.stringify(data, null, 2));
                }}
              >
                Export namespace
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  const blob = await backupJsonStore();
                  const url = URL.createObjectURL(new Blob([blob], { type: "application/json" }));
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `azura-backup-${Date.now()}.json`;
                  a.click();
                }}
              >
                Download full backup
              </Button>
            </div>
            <Textarea value={exportData} readOnly rows={5} className="font-mono text-xs" />
            <Label>Import namespace JSON</Label>
            <Textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              rows={5}
              className="font-mono text-xs"
            />
            <Button
              type="button"
              onClick={() => {
                startTransition(async () => {
                  await importJsonNamespace(namespace, importData);
                  alert("Imported");
                });
              }}
            >
              Import namespace
            </Button>
            <Label>Restore full backup (replaces whitelisted namespaces)</Label>
            <Textarea
              value={restoreData}
              onChange={(e) => setRestoreData(e.target.value)}
              rows={8}
              className="font-mono text-xs"
              placeholder='{"version":1,"records":[...]}'
            />
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!confirm("Restore will overwrite JSON store keys. Continue?")) return;
                startTransition(async () => {
                  const result = await restoreJsonStore(restoreData);
                  alert(`Restored ${result.restored} records`);
                });
              }}
            >
              Restore backup
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
