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
import { SeoSubmissionJobsTable } from "./seo-submission-jobs-table";

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

type WorkflowStepProps = {
  step: number;
  title: string;
  description: string;
  pending: boolean;
  buttonLabel: string;
  buttonVariant?: "default" | "outline";
  onClick: () => void;
};

function WorkflowStep({
  step,
  title,
  description,
  pending,
  buttonLabel,
  buttonVariant = "default",
  onClick,
}: WorkflowStepProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          aria-hidden
        >
          {step}
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button
        type="button"
        variant={buttonVariant}
        disabled={pending}
        onClick={onClick}
        className="w-full shrink-0 sm:w-auto"
      >
        {buttonLabel}
      </Button>
    </div>
  );
}

export function IntegrationsQueuePanel({ metrics, health, sitemapUrl }: IntegrationsQueuePanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<SeoActionResult | null>(null);

  const configuredProviders = health.filter((item) => item.enabled && item.ok);
  const setupComplete = configuredProviders.length > 0;
  const sitemapProviders = configuredProviders.filter(
    (item) => item.provider === "bing" || item.provider === "google",
  );
  const indexNowReady = configuredProviders.some((item) => item.provider === "indexnow");
  const sitemapReady = sitemapProviders.length > 0;

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
          {indexNowReady && !sitemapReady ? (
            <p className="text-sm text-amber-900 dark:text-amber-100">
              IndexNow is ready for page URL notifications when you publish content. Sitemap submission
              requires{" "}
              <Link href="/admin/seo/integrations?tab=configure&provider=bing" className="text-primary underline">
                Bing Webmaster
              </Link>{" "}
              or{" "}
              <Link href="/admin/seo/google" className="text-primary underline">
                Google Search Console
              </Link>
              .
            </p>
          ) : null}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow</CardTitle>
          <CardDescription>
            Follow these steps in order. Analytics sync is independent; sitemap submission uses queue then run.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <WorkflowStep
            step={1}
            title="Run analytics sync"
            description="Pull latest Search Console, GA4, and Bing metrics into the dashboard. Refresh the page after about 1 minute."
            pending={pending}
            buttonLabel="Run analytics sync"
            buttonVariant="outline"
            onClick={() => runAction(runSeoAnalyticsIngestionAction, { refreshAfter: false })}
          />
          <WorkflowStep
            step={2}
            title="Queue sitemap submission"
            description="Add sitemap jobs for Bing and Google Search Console. IndexNow does not accept sitemap.xml."
            pending={pending}
            buttonLabel="Queue sitemap submission"
            buttonVariant="outline"
            onClick={() => runAction(enqueueSitemapSubmissionAction)}
          />
          <WorkflowStep
            step={3}
            title="Run queue now"
            description="Process pending and retryable failed jobs (up to 25 at a time)."
            pending={pending}
            buttonLabel="Run queue now"
            onClick={() => runAction(runSeoSubmissionQueueAction)}
          />

          <div className="rounded-lg border border-dashed p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Quick action</p>
                <p className="text-xs text-muted-foreground">
                  Shortcut when you don&apos;t need to queue and run separately — runs steps 2 and 3 in one click.
                </p>
              </div>
              <Button
                type="button"
                disabled={pending}
                onClick={() => runAction(submitSitemapAndRunAction)}
                className="w-full shrink-0 sm:w-auto"
              >
                Submit sitemap to search engines
              </Button>
            </div>
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
        </CardContent>
      </Card>

      <SeoSubmissionJobsTable jobs={metrics.recent} />
    </div>
  );
}
