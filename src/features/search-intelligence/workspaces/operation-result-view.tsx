import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { ExecutionRecord } from "@/features/search-intelligence/operations/types";
import { summarizeOperationResult } from "@/features/search-intelligence/operations/result-summary";

function ScorePill({ label, value }: { label: string; value: number | null | undefined }) {
  if (value == null) return null;
  return (
    <div className="rounded-md border px-3 py-2 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function PageSpeedResult({ result }: { result: Record<string, unknown> }) {
  const opportunities = Array.isArray(result.opportunities)
    ? (result.opportunities as Array<{ title?: string; savingsMs?: number }>)
    : [];
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <ScorePill label="Performance" value={result.performanceScore as number | null} />
        <ScorePill label="Accessibility" value={result.accessibilityScore as number | null} />
        <ScorePill label="Best Practices" value={result.bestPracticesScore as number | null} />
        <ScorePill label="SEO" value={result.seoScore as number | null} />
      </div>
      <div className="grid gap-2 sm:grid-cols-3 text-sm">
        <div className="rounded-md border px-3 py-2">
          <div className="text-muted-foreground">LCP</div>
          <div className="font-semibold">
            {typeof result.lcpMs === "number" ? `${(result.lcpMs / 1000).toFixed(1)}s` : "—"}
          </div>
        </div>
        <div className="rounded-md border px-3 py-2">
          <div className="text-muted-foreground">CLS</div>
          <div className="font-semibold">
            {typeof result.cls === "number" ? result.cls : "—"}
          </div>
        </div>
        <div className="rounded-md border px-3 py-2">
          <div className="text-muted-foreground">INP / FID</div>
          <div className="font-semibold">
            {typeof result.inpMs === "number" ? `${result.inpMs}ms` : "—"}
          </div>
        </div>
      </div>
      {opportunities.length > 0 ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">Top opportunities</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {opportunities.map((item, idx) => (
              <li key={`${item.title}-${idx}`}>
                {item.title}
                {typeof item.savingsMs === "number" ? ` (~${Math.round(item.savingsMs)}ms)` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {typeof result.configureHref === "string" ? (
        <Link href={result.configureHref} className="text-sm text-primary hover:underline">
          Configure PageSpeed
        </Link>
      ) : null}
    </div>
  );
}

function SitemapResult({ result }: { result: Record<string, unknown> }) {
  const added = Array.isArray(result.added) ? (result.added as string[]) : [];
  const removed = Array.isArray(result.removed) ? (result.removed as string[]) : [];
  return (
    <div className="space-y-3 text-sm">
      <div className="grid gap-2 sm:grid-cols-4">
        <div className="rounded-md border px-3 py-2">
          <div className="text-muted-foreground">URLs</div>
          <div className="font-semibold tabular-nums">{String(result.urlCount ?? "—")}</div>
        </div>
        <div className="rounded-md border px-3 py-2">
          <div className="text-muted-foreground">Added</div>
          <div className="font-semibold tabular-nums text-emerald-700">{String(result.addedCount ?? 0)}</div>
        </div>
        <div className="rounded-md border px-3 py-2">
          <div className="text-muted-foreground">Removed</div>
          <div className="font-semibold tabular-nums text-destructive">
            {String(result.removedCount ?? 0)}
          </div>
        </div>
        <div className="rounded-md border px-3 py-2">
          <div className="text-muted-foreground">Unchanged</div>
          <div className="font-semibold tabular-nums">{String(result.unchangedCount ?? "—")}</div>
        </div>
      </div>
      {added.length > 0 ? (
        <div>
          <p className="font-medium mb-1">Added</p>
          <ul className="max-h-40 overflow-auto space-y-0.5 text-muted-foreground">
            {added.map((url) => (
              <li key={url} className="truncate">
                {url}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {removed.length > 0 ? (
        <div>
          <p className="font-medium mb-1">Removed</p>
          <ul className="max-h-40 overflow-auto space-y-0.5 text-muted-foreground">
            {removed.map((url) => (
              <li key={url} className="truncate">
                {url}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {typeof result.previewHref === "string" ? (
        <Link href={result.previewHref} className="text-primary hover:underline">
          Open sitemap preview
        </Link>
      ) : (
        <Link href="/admin/seo/sitemap" className="text-primary hover:underline">
          Open sitemap preview
        </Link>
      )}
    </div>
  );
}

function InspectResult({ result }: { result: Record<string, unknown> }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 text-sm">
      <div className="rounded-md border px-3 py-2">
        <div className="text-muted-foreground">Indexed</div>
        <div className="font-semibold">{result.indexed ? "Yes" : "No"}</div>
      </div>
      <div className="rounded-md border px-3 py-2">
        <div className="text-muted-foreground">Last crawled</div>
        <div className="font-semibold">{String(result.lastCrawledLabel ?? "—")}</div>
      </div>
      <div className="rounded-md border px-3 py-2">
        <div className="text-muted-foreground">Canonical</div>
        <div className="font-semibold break-all">{String(result.canonical ?? "—")}</div>
      </div>
      <div className="rounded-md border px-3 py-2">
        <div className="text-muted-foreground">Rich results</div>
        <div className="font-semibold">{String(result.richResults ?? "—")}</div>
      </div>
      {typeof result.rawSummary === "string" ? (
        <div className="sm:col-span-2 text-muted-foreground">{result.rawSummary}</div>
      ) : null}
    </div>
  );
}

export function OperationResultView({ record }: { record: ExecutionRecord }) {
  const result = record.result ?? null;
  const summary = summarizeOperationResult(record);
  const isPageSpeed =
    record.definitionId === "google.run_pagespeed" ||
    typeof result?.performanceScore === "number" ||
    (typeof result?.lcpMs === "number" && result?.live === true);
  const isSitemap =
    record.definitionId === "sitemap.rebuild" ||
    result?.rebuilt === true ||
    typeof result?.urlCount === "number";
  const isInspect =
    record.definitionId === "page.inspect_url" || typeof result?.indexed === "boolean";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{record.status}</Badge>
        {result?.live === true ? (
          <Badge className="bg-emerald-600 text-white border-transparent">Live</Badge>
        ) : result?.simulated === true ? (
          <Badge className="bg-amber-500 text-white border-transparent">Simulated</Badge>
        ) : null}
        <span className="text-sm text-muted-foreground">{summary}</span>
      </div>

      {record.error ? <p className="text-sm text-destructive">{record.error}</p> : null}

      {result && isPageSpeed ? <PageSpeedResult result={result} /> : null}
      {result && isSitemap ? <SitemapResult result={result} /> : null}
      {result && isInspect ? <InspectResult result={result} /> : null}

      {result && !isPageSpeed && !isSitemap && !isInspect ? (
        <pre className="overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}

      {result && (isPageSpeed || isSitemap || isInspect) ? (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">Raw result JSON</summary>
          <pre className="mt-2 overflow-auto rounded-md border bg-muted/30 p-3">
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
