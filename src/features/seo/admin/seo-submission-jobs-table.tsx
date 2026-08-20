"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { resolveSubmissionJobFix } from "./resolve-submission-job-fix";

export type SubmissionJobRow = {
  id: string;
  provider: string;
  kind: string;
  status: string;
  url: string;
  lastError: string | null;
};

const STATUS_META: Record<
  string,
  { description: string; className: string }
> = {
  PENDING: {
    description: "Queued; waiting until its scheduled time.",
    className: "border-transparent bg-amber-500 text-white",
  },
  RUNNING: {
    description: "Currently being processed by the queue runner.",
    className: "border-transparent bg-sky-600 text-white",
  },
  COMPLETED: {
    description: "Provider accepted the submission.",
    className: "border-transparent bg-emerald-600 text-white",
  },
  FAILED: {
    description:
      "Failed but will retry automatically (up to 5 attempts, with backoff: 1m → 5m → 30m → 2h → 6h).",
    className: "border-transparent bg-amber-600 text-white",
  },
  EXHAUSTED: {
    description:
      "Failed 5 times; no more automatic retries — fix the issue and re-queue.",
    className: "border-transparent bg-red-600 text-white",
  },
};

const STATUS_LEGEND = [
  ["PENDING", STATUS_META.PENDING.description],
  ["RUNNING", STATUS_META.RUNNING.description],
  ["COMPLETED", STATUS_META.COMPLETED.description],
  ["FAILED", STATUS_META.FAILED.description],
  ["EXHAUSTED", STATUS_META.EXHAUSTED.description],
] as const;

function StatusBadge({ status }: { status: string }) {
  const key = status.toUpperCase();
  const meta = STATUS_META[key];
  const description = meta?.description ?? "Unknown job status.";
  const badge = (
    <Badge className={cn(meta?.className ?? "border-transparent bg-slate-500 text-white")}>
      {key}
    </Badge>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex cursor-help border-0 bg-transparent p-0">
          {badge}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {description}
      </TooltipContent>
    </Tooltip>
  );
}

function FixCell({ job }: { job: SubmissionJobRow }) {
  const fix = resolveSubmissionJobFix(job);
  if (!fix) {
    return <span className="text-muted-foreground">—</span>;
  }

  const buttonClass =
    "inline-flex items-center rounded-md border border-foreground/20 bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted/50";

  return (
    <div className="min-w-0 space-y-1.5">
      {fix.fixHref ? (
        <Link href={fix.fixHref} className={buttonClass}>
          {fix.fixLabel ?? "Fix"}
        </Link>
      ) : null}
      <p className="text-[11px] leading-snug text-muted-foreground whitespace-normal break-words">
        {fix.suggestion}
      </p>
    </div>
  );
}

type SeoSubmissionJobsTableProps = {
  jobs: SubmissionJobRow[];
};

export function SeoSubmissionJobsTable({ jobs }: SeoSubmissionJobsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent jobs</CardTitle>
        <CardDescription className="space-y-1.5">
          <span className="block">Latest submission queue activity.</span>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {STATUS_LEGEND.map(([status, description]) => (
              <li key={status}>
                <span className="font-medium text-foreground">{status}</span>
                <span className="text-muted-foreground"> — {description}</span>
              </li>
            ))}
          </ul>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={200}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pe-3">Provider</th>
                  <th className="py-2 pe-3">Kind</th>
                  <th className="py-2 pe-3">Status</th>
                  <th className="py-2 pe-3">URL</th>
                  <th className="py-2 pe-3">Error</th>
                  <th className="py-2 pe-3">How to fix</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-t align-top">
                    <td className="py-2 pe-3 capitalize">{job.provider}</td>
                    <td className="py-2 pe-3">{job.kind}</td>
                    <td className="py-2 pe-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="max-w-[220px] py-2 pe-3">
                      <span className="block break-all" title={job.url}>
                        {job.url}
                      </span>
                    </td>
                    <td className="max-w-[280px] py-2 pe-3 text-muted-foreground">
                      {job.lastError ? (
                        <span
                          className="block whitespace-normal break-words"
                          title={job.lastError}
                        >
                          {job.lastError}
                        </span>
                      ) : (
                        ""
                      )}
                    </td>
                    <td className="max-w-[280px] py-2 pe-3">
                      <FixCell job={job} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {jobs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No submission jobs yet.</p>
            ) : null}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
