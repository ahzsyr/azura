"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CatalogPageHeader,
  CatalogSection,
  CatalogStat,
  CatalogStatGroup,
} from "@/features/catalog/admin/ui";
import { TaxonomyHealthSummary } from "@/features/catalog/admin/taxonomy/TaxonomyHealthSummary";

type SyncWarning = { code: string; message: string };

type SyncReport = {
  generatedAt: string;
  locale: string;
  totalProducts: number;
  totalCollections: number;
  orphanProducts: number;
  ambiguousMatches: number;
  newCollectionsCreated: number;
  warnings: SyncWarning[];
  collectionCounts?: Record<string, number>;
  indexesRebuilt?: boolean;
};

type AuditEntry = {
  id: string;
  timestamp: string;
  locale: string;
  totalProducts: number;
  totalCollections: number;
  orphanProducts: number;
  ambiguousMatches: number;
  warningsCount: number;
  newCollectionsCreated: number;
};

const API: RequestInit = { credentials: "include" };

export function SyncCenterPanel({ locale = "en-us" }: { locale?: string }) {
  const [report, setReport] = useState<SyncReport | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAudit = useCallback(async () => {
    try {
      const res = await fetch("/api/catalog/sync-audit", API);
      const json = (await res.json()) as { runs?: AuditEntry[] };
      if (res.ok) setAudit(json.runs ?? []);
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  const preview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/sync-collections?locale=${encodeURIComponent(locale)}`,
        API,
      );
      const json = (await res.json()) as { report?: SyncReport; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Preview failed");
      setReport(json.report ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    setApplying(true);
    setError(null);
    try {
      // Phase 4: autoCreate remains dead — API rejects autoCreate:true.
      const res = await fetch("/api/sync-collections", {
        ...API,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, autoCreate: false }),
      });
      const json = (await res.json()) as { report?: SyncReport; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Sync failed");
      setReport(json.report ?? null);
      await loadAudit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setApplying(false);
    }
  };

  const emptyCollections = report
    ? Object.values(report.collectionCounts ?? {}).filter((n) => n === 0).length
    : 0;

  return (
    <div className="space-y-6">
      <CatalogPageHeader
        title="Sync Center"
        description="Preview and apply category membership sync against existing categories only. Categories are never auto-created."
        actions={
          <>
            <Button type="button" variant="outline" disabled={loading || applying} onClick={() => void preview()}>
              {loading ? "Previewing…" : "Preview"}
            </Button>
            <Button type="button" disabled={loading || applying} onClick={() => void apply()}>
              {applying ? "Applying…" : "Apply Sync"}
            </Button>
          </>
        }
      />

      <CatalogSection
        title="Policy"
        description="MANUAL category memberships are preserved. Sync never creates missing categories."
      >
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Existing categories only — unmatched products are reported, not auto-filed.</li>
          <li>MANUAL memberships remain durable; rule memberships can be rebuilt.</li>
          <li>
            Review unmatched products in{" "}
            <Link href="/admin/categories#issues" className="text-primary underline">
              Categories → Issues
            </Link>
            .
          </li>
        </ul>
      </CatalogSection>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {report ? (
        <>
          <CatalogStatGroup>
            <CatalogStat label="Products" value={report.totalProducts} />
            <CatalogStat label="Categories" value={report.totalCollections} />
            <CatalogStat label="Unmatched" value={report.orphanProducts} warn={report.orphanProducts > 0} />
            <CatalogStat label="Warnings" value={report.warnings.length} warn={report.warnings.length > 0} />
            <CatalogStat label="Ambiguous" value={report.ambiguousMatches} warn={report.ambiguousMatches > 0} />
            <CatalogStat
              label="Auto-created"
              value={report.newCollectionsCreated}
              warn={report.newCollectionsCreated > 0}
            />
          </CatalogStatGroup>

          <TaxonomyHealthSummary
            total={report.totalCollections}
            empty={emptyCollections}
            unmatched={report.orphanProducts}
            warnings={report.warnings.length}
          />

          {report.warnings.length > 0 ? (
            <CatalogSection title="Warnings" description="Issues detected in the latest preview or apply.">
              <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                {report.warnings.slice(0, 40).map((w, i) => (
                  <li key={`${w.code}-${i}`} className="text-muted-foreground">
                    <span className="font-medium text-foreground">{w.code}</span> — {w.message}
                  </li>
                ))}
              </ul>
            </CatalogSection>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Report generated {new Date(report.generatedAt).toLocaleString()} · locale {report.locale}
            {report.indexesRebuilt ? " · indexes rebuilt" : ""}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Run Preview to validate membership against existing categories without writing changes.
        </p>
      )}

      <CatalogSection title="Audit log" description="Recent successful sync apply runs.">
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sync runs recorded yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {audit.map((run) => (
              <li key={run.id} className="rounded-md border px-3 py-2">
                <div className="font-medium">{new Date(run.timestamp).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">
                  {run.totalProducts} products · {run.totalCollections} categories ·{" "}
                  {run.orphanProducts} unmatched · {run.warningsCount} warnings
                </div>
              </li>
            ))}
          </ul>
        )}
      </CatalogSection>
    </div>
  );
}
