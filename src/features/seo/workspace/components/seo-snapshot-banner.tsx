import Link from "next/link";
import type { SeoAuditSnapshot } from "../types";

type Props = {
  snapshot: SeoAuditSnapshot | null;
  className?: string;
};

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}m ${rem}s`;
}

export function SeoSnapshotBanner({ snapshot, className }: Props) {
  if (!snapshot) {
    return (
      <div className={`rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground ${className ?? ""}`}>
        No site audit yet.{" "}
        <Link href="/admin/seo" className="text-primary underline-offset-4 hover:underline">
          Run a site audit
        </Link>{" "}
        from Overview to populate Technical Audit and Issues.
      </div>
    );
  }

  const completed = new Date(snapshot.completedAt);

  return (
    <div className={`flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm ${className ?? ""}`}>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Site Audit</p>
        <p className="font-medium capitalize">{snapshot.status}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Completed</p>
        <p className="font-medium">
          {completed.toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Duration</p>
        <p className="font-medium">{formatDuration(snapshot.durationMs)}</p>
      </div>
      {snapshot.pagesCrawled != null && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Signals</p>
          <p className="font-medium">{snapshot.pagesCrawled}</p>
        </div>
      )}
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Snapshot</p>
        <p className="font-mono text-xs font-medium">{snapshot.id}</p>
      </div>
    </div>
  );
}
