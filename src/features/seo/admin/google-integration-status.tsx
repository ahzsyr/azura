"use client";

import type { PublicSeoIntegrationProviderConfig, SeoProviderHealth } from "@/features/seo/types";
import { cn } from "@/lib/utils";
import {
  buildGoogleRecordedSummary,
  getGoogleSetupSteps,
  isGscSitemapReady,
} from "./google-integration-readiness";

type GoogleIntegrationStatusProps = {
  google: PublicSeoIntegrationProviderConfig;
  health: SeoProviderHealth[];
  sitemapUrl: string;
  canStartGoogleOAuth: boolean;
  integrationsSaved?: boolean;
  googleOAuthStatus?: string;
  googleOAuthMessage?: string;
  onDismissSaved?: () => void;
};

function RecordedDataList({
  summary,
}: {
  summary: ReturnType<typeof buildGoogleRecordedSummary>;
}) {
  const credentialFlags = [
    summary.hasBearerToken ? "Bearer token saved" : "Bearer token not set",
    summary.hasClientSecret ? "Client secret saved" : "Client secret not set",
    summary.hasRefreshToken ? "Refresh token saved" : "Refresh token not set",
  ];

  return (
    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
      <li>
        <span className="text-foreground">Enabled:</span> {summary.enabled ? "Yes" : "No"}
      </li>
      <li>
        <span className="text-foreground">Analytics ingestion:</span>{" "}
        {summary.analyticsEnabled ? "On" : "Off"}
      </li>
      {summary.siteUrl ? (
        <li>
          <span className="text-foreground">GSC site URL:</span>{" "}
          <code className="text-xs">{summary.siteUrl}</code>
        </li>
      ) : null}
      <li>
        <span className="text-foreground">Sitemap URL:</span>{" "}
        <code className="text-xs">{summary.sitemapUrl}</code>
      </li>
      {summary.clientId ? (
        <li>
          <span className="text-foreground">OAuth client ID:</span>{" "}
          <code className="text-xs">{summary.clientId}</code>
        </li>
      ) : null}
      {summary.ga4PropertyId ? (
        <li>
          <span className="text-foreground">GA4 property ID:</span>{" "}
          <code className="text-xs">{summary.ga4PropertyId}</code>
        </li>
      ) : summary.analyticsEnabled ? (
        <li>
          <span className="text-foreground">GA4 property ID:</span> not set
        </li>
      ) : null}
      {credentialFlags.map((flag) => (
        <li key={flag}>{flag}</li>
      ))}
      <li>
        <span className="text-foreground">GSC sitemap:</span>{" "}
        {summary.gscSitemapReady ? "Configured" : "Setup needed"}
      </li>
      {summary.analyticsEnabled ? (
        <>
          <li>
            <span className="text-foreground">GSC search analytics:</span>{" "}
            {summary.gscSearchAnalyticsReady ? "Configured" : "Setup needed"}
          </li>
          <li>
            <span className="text-foreground">GA4 analytics:</span>{" "}
            {summary.ga4AnalyticsReady ? "Configured" : "Setup needed"}
          </li>
        </>
      ) : null}
    </ul>
  );
}

export function GoogleIntegrationStatus({
  google,
  health,
  sitemapUrl,
  canStartGoogleOAuth,
  integrationsSaved = false,
  googleOAuthStatus,
  googleOAuthMessage,
  onDismissSaved,
}: GoogleIntegrationStatusProps) {
  const googleHealth = health.find((item) => item.provider === "google");
  const summary = buildGoogleRecordedSummary(google, sitemapUrl);
  const setupSteps = getGoogleSetupSteps(google, canStartGoogleOAuth);
  const connected = Boolean(googleHealth?.ok && isGscSitemapReady(google));

  if (googleOAuthStatus === "error") {
    return (
      <div
        className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive md:col-span-2"
        role="alert"
      >
        <p className="font-medium">Google connection failed</p>
        <p className="mt-1">{googleOAuthMessage || "OAuth failed. Try connecting again."}</p>
        <RecordedDataList summary={summary} />
      </div>
    );
  }

  if (googleOAuthStatus === "success") {
    return (
      <div
        className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100 md:col-span-2"
        role="status"
      >
        <p className="font-medium">Google connected — tokens saved</p>
        <RecordedDataList summary={summary} />
      </div>
    );
  }

  if (integrationsSaved) {
    return (
      <div
        className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100 md:col-span-2"
        role="status"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">Configuration saved</p>
          {onDismissSaved ? (
            <button
              type="button"
              className="text-xs underline underline-offset-2"
              onClick={onDismissSaved}
            >
              Dismiss
            </button>
          ) : null}
        </div>
        <RecordedDataList summary={summary} />
        {!connected && setupSteps.length > 0 ? (
          <p className="mt-2 text-xs">Next: {setupSteps[0]}</p>
        ) : null}
      </div>
    );
  }

  if (connected) {
    return (
      <div
        className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100 md:col-span-2"
        role="status"
      >
        <p className="font-medium">Google Search Console connected</p>
        <p className="mt-1 text-xs">{googleHealth?.message}</p>
        <RecordedDataList summary={summary} />
      </div>
    );
  }

  if (google.enabled && setupSteps.length > 0) {
    return (
      <div
        className={cn(
          "rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100 md:col-span-2",
        )}
        role="status"
      >
        <p className="font-medium">Setup needed</p>
        <ul className="mt-2 list-disc space-y-1 ps-4 text-xs">
          {setupSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
        {(google.siteUrl || google.clientId || google.hasBearerToken) && (
          <div className="mt-3 border-t border-amber-500/20 pt-2">
            <p className="text-xs font-medium">Recorded so far</p>
            <RecordedDataList summary={summary} />
          </div>
        )}
      </div>
    );
  }

  if (google.siteUrl || google.clientId || google.hasBearerToken) {
    return (
      <div
        className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm md:col-span-2"
        role="status"
      >
        <p className="font-medium">Saved configuration</p>
        <RecordedDataList summary={summary} />
      </div>
    );
  }

  return null;
}
