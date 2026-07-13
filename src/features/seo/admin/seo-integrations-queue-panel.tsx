"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  enqueueSitemapSubmissionAction,
  runSeoAnalyticsIngestionAction,
  runSeoSubmissionQueueAction,
  submitSitemapAndRunAction,
  type SeoActionResult,
} from "@/features/seo/actions";
import type { SeoProviderHealth } from "@/features/seo/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, XCircle } from "lucide-react";

type SubmissionMetrics = {
  recent: Array<{
    id: string;
    provider: string;
    kind: string;
    status: string;
    url: string;
    lastError: string | null;
  }>;
};

type IntegrationsQueuePanelProps = {
  metrics: SubmissionMetrics;
  health: SeoProviderHealth[];
  sitemapUrl: string;
};

function PrerequisiteRow({ ok, label }: { ok: boolean; label: string }) {
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className={cn("mt-0.5 size-4 shrink-0", ok ? "text-emerald-600" : "text-amber-600")} />
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}

export function IntegrationsQueuePanel({ metrics, health, sitemapUrl }: IntegrationsQueuePanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<SeoActionResult | null>(null);

  const configuredProviders = health.filter((item) => item.enabled && item.ok);
  const setupComplete = configuredProviders.length > 0;

  const runAction = (action: () => Promise<SeoActionResult>, options?: { refreshAfter?: boolean }) => {
    startTransition(async () => {
      const result = await action();
      setFeedback(result);
      if (options?.refreshAfter !== false) {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Before you submit</CardTitle>
          <CardDescription>
            Sitemap URL sent to search engines:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{sitemapUrl}</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {health.map((item) => (
              <PrerequisiteRow
                key={item.provider}
                ok={item.enabled && item.ok}
                label={`${item.provider}: ${item.enabled ? item.message : "disabled"}`}
              />
            ))}
            {health.length === 0 ? (
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Circle className="size-4" />
                No provider data available.
              </li>
            ) : null}
          </ul>
          {!setupComplete ? (
            <p className="text-sm text-amber-900 dark:text-amber-100">
              Configure providers on the{" "}
              <Link href="/admin/seo/integrations?tab=configure" className="text-primary underline">
                Configure
              </Link>{" "}
              tab before queueing submissions.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <Button type="button" disabled={pending} onClick={() => runAction(submitSitemapAndRunAction)}>
            Submit sitemap to search engines
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => runAction(enqueueSitemapSubmissionAction)}
          >
            Queue sitemap submission
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => runAction(runSeoSubmissionQueueAction)}
          >
            Run queue now
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => runAction(runSeoAnalyticsIngestionAction, { refreshAfter: false })}
          >
            Run analytics sync
          </Button>
        </div>

        {feedback ? (
          <p
            className={cn(
              "rounded-md border px-3 py-2 text-sm",
              feedback.ok
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
                : "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
            )}
            role="status"
          >
            {feedback.message}
          </p>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pe-3">Provider</th>
                  <th className="py-2 pe-3">Kind</th>
                  <th className="py-2 pe-3">Status</th>
                  <th className="py-2 pe-3">URL</th>
                  <th className="py-2 pe-3">Error</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recent.map((job) => (
                  <tr key={job.id} className="border-t">
                    <td className="py-2 pe-3">{job.provider}</td>
                    <td className="py-2 pe-3">{job.kind}</td>
                    <td className="py-2 pe-3">{job.status}</td>
                    <td className="max-w-[280px] truncate py-2 pe-3">{job.url}</td>
                    <td className="max-w-[280px] truncate py-2 pe-3 text-muted-foreground">
                      {job.lastError ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {metrics.recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No submission jobs yet.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
