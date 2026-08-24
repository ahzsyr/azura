import type { SeoDeveloperDetails } from "../types";

type Props = {
  details: SeoDeveloperDetails;
};

export function SeoDeveloperDetailsPanel({ details }: Props) {
  return (
    <details className="rounded-lg border">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Developer Details</summary>
      <dl className="grid gap-3 border-t px-4 py-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Correlation ID</dt>
          <dd className="font-mono text-xs break-all">{details.correlationId ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Snapshot ID</dt>
          <dd className="font-mono text-xs break-all">{details.snapshotId ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Execution Time</dt>
          <dd>
            {details.executionTimeMs != null ? `${details.executionTimeMs}ms` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Pipeline Version</dt>
          <dd className="font-mono text-xs">{details.pipelineVersion}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Analyzers</dt>
          <dd className="font-mono text-xs">
            {details.analyzerIds.length ? details.analyzerIds.join(", ") : "—"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Rule IDs</dt>
          <dd className="font-mono text-xs">
            {details.ruleIds.length ? details.ruleIds.join(", ") : "—"}
          </dd>
        </div>
      </dl>
    </details>
  );
}
