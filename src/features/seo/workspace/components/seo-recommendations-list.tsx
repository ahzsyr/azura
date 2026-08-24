import type { SeoIssue } from "../types";

type Props = {
  issues: SeoIssue[];
};

export function SeoRecommendationsList({ issues }: Props) {
  if (issues.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        No recommended improvements for this scope. Run Content Audit on a target, or run a site
        audit first.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {issues.map((issue) => (
        <li key={issue.id} className="rounded-lg border p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{issue.title}</p>
            <span className="text-xs uppercase tracking-wide text-muted-foreground capitalize">
              {issue.severity} · {issue.impact} impact · {issue.fixKind}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{issue.message}</p>
          <p className="text-xs text-muted-foreground capitalize">
            Category: {issue.category}
            {issue.pageUrl ? ` · ${issue.pageUrl}` : null}
          </p>
        </li>
      ))}
    </ul>
  );
}
