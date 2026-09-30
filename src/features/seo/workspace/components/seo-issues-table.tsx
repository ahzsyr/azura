"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { SeoIssue } from "../types";
import { resolveSeoIssueFix } from "../resolve-seo-issue-fix";
import { cn } from "@/lib/utils";

type Props = {
  issues: SeoIssue[];
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

const severityClass: Record<SeoIssue["severity"], string> = {
  critical: "bg-red-100 text-red-800",
  warn: "bg-amber-100 text-amber-900",
  info: "bg-slate-100 text-slate-700",
};

function withFreshFix(issue: SeoIssue): SeoIssue {
  const fix = resolveSeoIssueFix({
    title: issue.title,
    message: issue.message,
    href: issue.fixHref?.startsWith("/admin") ? issue.fixHref : undefined,
    source: issue.pageUrl,
    pageUrl: issue.pageUrl,
    entityType: issue.entityType,
    entityId: issue.entityId,
  });
  if (!fix) return issue;
  return {
    ...issue,
    fixHref: fix.fixHref,
    fixLabel: fix.fixLabel,
    suggestion: fix.suggestion,
  };
}

function pageLabel(issue: SeoIssue): string {
  if (issue.pageUrl) return issue.pageUrl;
  if (issue.entityType && issue.entityId) return `${issue.entityType}/${issue.entityId}`;
  return "—";
}

function PageCell({ issue }: { issue: SeoIssue }) {
  const label = pageLabel(issue);
  if (label === "—") {
    return <span className="text-muted-foreground">—</span>;
  }

  const href =
    issue.pageUrl?.startsWith("/") || issue.pageUrl?.startsWith("http")
      ? issue.pageUrl
      : issue.fixHref;

  const className =
    "block max-w-full truncate text-primary underline-offset-2 hover:underline";

  if (!href) {
    return (
      <span className="block max-w-full truncate" title={label}>
        {label}
      </span>
    );
  }

  if (href.startsWith("http")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        title={label}
      >
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className} title={label}>
      {label}
    </Link>
  );
}

function FixCell({ issue }: { issue: SeoIssue }) {
  if (issue.fixHref) {
    const external = issue.fixHref.startsWith("http");
    const label = issue.fixLabel ?? "Fix";
    const buttonClass =
      "inline-flex items-center rounded-md border border-foreground/20 bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted/50";

    return (
      <div className="min-w-0 space-y-1">
        {external ? (
          <a href={issue.fixHref} target="_blank" rel="noopener noreferrer" className={buttonClass}>
            {label}
          </a>
        ) : (
          <Link href={issue.fixHref} className={buttonClass}>
            {label}
          </Link>
        )}
        {issue.suggestion ? (
          <p className="text-[11px] leading-snug text-muted-foreground line-clamp-3" title={issue.suggestion}>
            {issue.suggestion}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-1">
      <span className="capitalize text-muted-foreground">{issue.fixKind}</span>
      {issue.suggestion ? (
        <p className="text-[11px] leading-snug text-muted-foreground line-clamp-3" title={issue.suggestion}>
          {issue.suggestion}
        </p>
      ) : null}
    </div>
  );
}

export function SeoIssuesTable({ issues }: Props) {
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);

  const enrichedIssues = useMemo(() => issues.map(withFreshFix), [issues]);

  const totalPages = Math.max(1, Math.ceil(enrichedIssues.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pageIssues = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return enrichedIssues.slice(start, start + pageSize);
  }, [enrichedIssues, currentPage, pageSize]);

  const rangeStart = enrichedIssues.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, enrichedIssues.length);

  if (enrichedIssues.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        No issues match the current filters.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">
            {rangeStart}–{rangeEnd}
          </span>{" "}
          of <span className="font-medium text-foreground">{enrichedIssues.length}</span>
        </p>
        <label className="flex items-center gap-2 text-muted-foreground">
          <span>Rows per page</span>
          <select
            className="h-8 rounded-md border bg-background px-2 text-foreground"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full table-fixed min-w-[920px] text-left text-sm">
          <colgroup>
            <col className="w-[7%]" />
            <col className="w-[22%]" />
            <col className="w-[33%]" />
            <col className="w-[8%]" />
            <col className="w-[22%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Severity</th>
              <th className="px-3 py-2 font-medium">Page</th>
              <th className="px-3 py-2 font-medium">Issue</th>
              <th className="px-3 py-2 font-medium">Impact</th>
              <th className="px-3 py-2 font-medium">Fix</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageIssues.map((issue) => (
              <tr key={issue.id} className="border-b last:border-0 align-top">
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-flex rounded px-2 py-0.5 text-xs font-medium capitalize",
                      severityClass[issue.severity],
                    )}
                  >
                    {issue.severity}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-xs overflow-hidden">
                  <PageCell issue={issue} />
                </td>
                <td className="px-3 py-2 overflow-hidden">
                  <p className="font-medium break-words">{issue.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 break-words">{issue.message}</p>
                </td>
                <td className="px-3 py-2 capitalize">{issue.impact}</td>
                <td className="px-3 py-2 overflow-hidden">
                  <FixCell issue={issue} />
                </td>
                <td className="px-3 py-2 capitalize">{issue.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Page {currentPage} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-muted/40"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-muted/40"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
