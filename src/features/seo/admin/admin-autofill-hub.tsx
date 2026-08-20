"use client";

import { useEffect, useState } from "react";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BulkAutoFillPanel } from "@/features/seo/admin/bulk-autofill-panel";
import {
  listRecentSeoChangeLogsAction,
  type SeoChangeLogEntry,
} from "@/features/seo/actions";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "bulk", label: "Bulk Auto-fill" },
  { id: "single", label: "Single Auto-fill" },
  { id: "history", label: "History" },
  { id: "settings", label: "Profiles & modes" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function AutofillHistoryPanel() {
  const [recentLogs, setRecentLogs] = useState<SeoChangeLogEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listRecentSeoChangeLogsAction(50)
      .then((rows) => {
        if (!cancelled) setRecentLogs(rows);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load history");
          setRecentLogs([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent SEO changes</CardTitle>
        <CardDescription>Audit trail for auto-fill and manual SEO commits.</CardDescription>
      </CardHeader>
      <CardContent>
        {recentLogs === null ? (
          <p className="text-sm text-muted-foreground">Loading history…</p>
        ) : loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : recentLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recentLogs.map((log) => (
              <li key={log.id} className="border-b pb-2 last:border-0">
                <span className="font-medium">{log.field}</span> on {log.entityKind}:{log.entityId} (
                {log.origin}) — {log.createdAt.slice(0, 16).replace("T", " ")}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminAutofillHub() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <AdminSettingsLayout tabs={[...TABS]} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as TabId)}>
      {(tab) => {
        if (tab === "overview") {
          return (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Auto-fill platform</CardTitle>
                  <CardDescription>
                    Generate SEO metadata from a shared content snapshot pipeline: snapshot →
                    generation → normalization → validation.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="font-medium text-foreground">Single Auto-fill</p>
                    <p className="mt-1">Use the Auto-fill button on any entity SEO tab (pages, posts, products).</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="font-medium text-foreground">Bulk Auto-fill</p>
                    <p className="mt-1">Run simulation first, then apply changes across a target scope.</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="font-medium text-foreground">Progress & history</p>
                    <p className="mt-1">Review recent applied changes in the History tab.</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="font-medium text-foreground">Profiles & apply modes</p>
                    <p className="mt-1">Control generation strategy and whether to fill empty or overwrite.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        }

        if (tab === "bulk") {
          return <BulkAutoFillPanel />;
        }

        if (tab === "single") {
          return (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Single Auto-fill</CardTitle>
                <CardDescription>
                  Open any CMS page, blog post, or product editor and use the SEO tab → Auto-fill button.
                  Preview suggested fields, select what to apply, then save.
                </CardDescription>
              </CardHeader>
            </Card>
          );
        }

        if (tab === "history") {
          return <AutofillHistoryPanel />;
        }

        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profiles, filters & apply modes</CardTitle>
              <CardDescription>
                Configure bulk runs from the Bulk Auto-fill tab. Profiles control generation strategy;
                apply modes control how existing values are treated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Profiles</p>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Conservative — minimal changes, safe defaults</li>
                  <li>Balanced — recommended for most sites</li>
                  <li>Aggressive — product-focused templates</li>
                  <li>AI assisted — uses AI provider when configured</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">Apply modes</p>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Fill empty only — preserves existing SEO values</li>
                  <li>Overwrite all — replaces all generated fields</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">Filters</p>
                <p className="mt-2">
                  Target scope (products, posts, CMS pages, static pages, or all) acts as the primary
                  filter. Run simulation before executing bulk changes.
                </p>
              </div>
            </CardContent>
          </Card>
        );
      }}
    </AdminSettingsLayout>
  );
}
