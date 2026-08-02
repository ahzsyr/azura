export type SubmissionJobFixInfo = {
  suggestion: string;
  fixHref?: string;
  fixLabel?: string;
};

type SubmissionJobFixInput = {
  provider: string;
  kind: string;
  status: string;
  lastError: string | null;
};

const CONFIGURE_HREF = "/admin/seo/integrations?tab=configure";
const MONITOR_HREF = "/admin/seo/integrations?tab=monitor";
const GOOGLE_HREF = "/admin/seo/google";

/**
 * Maps submission-queue job failures to actionable fix guidance for the admin UI.
 */
export function resolveSubmissionJobFix(job: SubmissionJobFixInput): SubmissionJobFixInfo | null {
  const status = job.status.toUpperCase();
  if (status === "COMPLETED" || status === "PENDING" || status === "RUNNING") {
    return null;
  }

  const error = job.lastError?.trim() ?? "";
  const lower = error.toLowerCase();
  const provider = job.provider.toLowerCase();
  const kind = job.kind.toUpperCase();

  if (
    (provider === "google" && kind === "URL") ||
    lower.includes("does not provide generic url submission") ||
    lower.includes("uses sitemap submission only")
  ) {
    return {
      suggestion:
        "Google Search Console only accepts sitemap submissions. Queue a sitemap job (workflow step 2 or Quick action) — individual page URLs are not sent to Google.",
    };
  }

  if (lower.includes("provider is disabled or missing credentials")) {
    return {
      suggestion: "Enable the provider and add credentials on the Configure tab.",
      fixHref: CONFIGURE_HREF,
      fixLabel: "Open Configure",
    };
  }

  if (lower.includes("missing credentials or site url")) {
    if (provider === "google") {
      return {
        suggestion: "Complete Google setup (OAuth, site URL, and GSC property) on the Google SEO page.",
        fixHref: GOOGLE_HREF,
        fixLabel: "Open Google setup",
      };
    }
    return {
      suggestion: "Complete provider setup (API key, site URL, or OAuth) on the Configure tab.",
      fixHref: CONFIGURE_HREF,
      fixLabel: "Open Configure",
    };
  }

  if (
    lower.includes("unauthorized") ||
    lower.includes("auth") ||
    /\b401\b/.test(error) ||
    /\b403\b/.test(error)
  ) {
    if (provider === "google") {
      return {
        suggestion: "Re-authenticate Google OAuth or verify the connected Search Console property.",
        fixHref: GOOGLE_HREF,
        fixLabel: "Open Google setup",
      };
    }
    return {
      suggestion: "Re-authenticate or verify the API token for this provider on the Configure tab.",
      fixHref: CONFIGURE_HREF,
      fixLabel: "Open Configure",
    };
  }

  if (lower.includes("quota") || lower.includes("rate") || /\b429\b/.test(error)) {
    return {
      suggestion:
        "Provider quota or rate limit hit. Wait for the quota to reset; FAILED jobs retry automatically with backoff.",
    };
  }

  if (lower.includes("unknown provider")) {
    return {
      suggestion: "Provider ID may be stale. Check integrations config on the Configure tab.",
      fixHref: CONFIGURE_HREF,
      fixLabel: "Open Configure",
    };
  }

  if (status === "EXHAUSTED") {
    return {
      suggestion:
        "Job failed 5 times and will not retry automatically. Fix the underlying issue, then re-queue via step 2 or the Quick action.",
      fixHref: CONFIGURE_HREF,
      fixLabel: "Check Configure",
    };
  }

  if (error) {
    return {
      suggestion:
        "Check provider health on the Monitoring tab, then fix credentials or re-run the queue after correcting the issue.",
      fixHref: MONITOR_HREF,
      fixLabel: "Open Monitoring",
    };
  }

  return {
    suggestion: "Job failed without a stored error. Check Monitoring for provider health, then re-run the queue.",
    fixHref: MONITOR_HREF,
    fixLabel: "Open Monitoring",
  };
}
