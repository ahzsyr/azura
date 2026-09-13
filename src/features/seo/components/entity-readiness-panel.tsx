"use client";

import Link from "next/link";
import type { SchemaGraphAuditResult, PublicHtmlAuditResult } from "@/features/seo/quality/schema-graph-audit.types";
import { entityReadinessUpdateLink } from "@/features/seo/quality/entity-readiness-links";
import { cn } from "@/lib/utils";

function statusLabel(status: string): string {
  switch (status) {
    case "provided":
      return "Provided";
    case "valid":
      return "Valid";
    case "eligible":
      return "Eligible";
    case "google-controlled":
      return "Google-controlled";
    case "observed":
      return "Observed";
    default:
      return "Missing";
  }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "text-xs rounded px-1.5 py-0.5",
        status === "missing" && "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
        status === "valid" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
        status === "provided" && "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
        status === "google-controlled" && "bg-muted text-muted-foreground",
        status === "eligible" && "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

type Props = {
  graphAudit: SchemaGraphAuditResult;
  publicAudit?: PublicHtmlAuditResult | null;
};

export function EntityReadinessPanel({ graphAudit, publicAudit }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2">Schema vs Google feature relevance</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="p-2">Schema / signal</th>
                <th className="p-2">Valid</th>
                <th className="p-2">Google feature relevance</th>
              </tr>
            </thead>
            <tbody>
              {graphAudit.schemaRelevance.map((row) => (
                <tr key={row.schemaType} className="border-b last:border-0">
                  <td className="p-2">{row.schemaType}</td>
                  <td className="p-2">{row.valid ? "✓" : "○"}</td>
                  <td className="p-2 text-muted-foreground">{row.googleFeatureRelevance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {graphAudit.sections.map((section) => (
        <div key={section.id}>
          <h3 className="font-semibold mb-2">{section.title}</h3>
          <ul className="space-y-2">
            {section.items.map((item) => {
              const updateLink =
                item.status === "missing" ? entityReadinessUpdateLink(item.label) : undefined;
              return (
                <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
                  <span>{item.label}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.detail ? (
                      <span className="text-xs text-muted-foreground truncate max-w-[12rem]">
                        {item.detail}
                      </span>
                    ) : null}
                    {updateLink ? (
                      <Link
                        href={updateLink.href}
                        className="text-xs text-primary hover:underline whitespace-nowrap"
                      >
                        Update → {updateLink.label}
                      </Link>
                    ) : null}
                    <StatusBadge status={item.status} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {graphAudit.relationshipIssues.length > 0 ? (
        <div>
          <h3 className="font-semibold mb-2">Relationship validation</h3>
          <ul className="space-y-1 text-sm">
            {graphAudit.relationshipIssues.map((issue, index) => (
              <li
                key={index}
                className={cn(
                  issue.level === "ERROR" ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300",
                )}
              >
                {issue.level}: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {publicAudit ? (
        <div>
          <h3 className="font-semibold mb-2">Public HTML audit diff</h3>
          {!publicAudit.fetched ? (
            <p className="text-sm text-red-600">{publicAudit.fetchError ?? "Fetch failed."}</p>
          ) : (
            <div className="space-y-3 text-sm">
              {publicAudit.nodeDiffs.map((diff) => (
                <div key={diff.schemaType} className="rounded border p-2">
                  <p className="font-medium">{diff.schemaType}</p>
                  <p>Generated: {diff.generated ? "✓" : "○"}</p>
                  <p>Published HTML: {diff.published ? "✓" : "○"}</p>
                  {diff.idMatch !== null ? <p>@id match: {diff.idMatch ? "✓" : "✗"}</p> : null}
                  <p>
                    Properties: {diff.propertyMatchCount} / {diff.propertyTotal}
                  </p>
                </div>
              ))}
              <div className="rounded border p-2">
                <p className="font-medium">SeoMeta.jsonLd</p>
                <p>Database: {publicAudit.seoMetaJsonLd.inDatabase ? "✓" : "○"}</p>
                <p>Resolved graph: {publicAudit.seoMetaJsonLd.inResolvedGraph ? "✓" : "○"}</p>
                <p>Published HTML: {publicAudit.seoMetaJsonLd.inPublishedHtml ? "✓" : "✗"}</p>
              </div>
              <p>Duplicate @id — Generated: {publicAudit.duplicateIdGenerated}, Published: {publicAudit.duplicateIdPublished}</p>
              {publicAudit.canonicalExpected ? (
                <p>
                  Canonical: {publicAudit.canonicalMatch ? "✓" : "✗"}{" "}
                  <span className="text-muted-foreground">{publicAudit.canonicalExpected}</span>
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
