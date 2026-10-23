import { createHash } from "node:crypto";

/**
 * CSP header builders for next.config.ts.
 * Policy body is intentionally unchanged from the historical Report-Only policy
 * until milestones CSP-2…CSP-4 (nonce/hash, drop unsafe-eval, shrink unsafe-inline).
 *
 * AZURA_CSP_MODE is read at Next config evaluation time (build / server start).
 * On Hostinger, set it in hPanel before build/redeploy — it is not a runtime toggle
 * after a standalone image is already built unless the process re-reads next.config.
 */

export type CspMode = "report" | "enforce";

/**
 * Default stays report-only until representative local production reports are
 * reviewed. Routes to exercise before setting AZURA_CSP_MODE=enforce:
 * home, account login, admin login, one public form, setup; navigate between
 * them; submit a form; open admin account settings. Read /api/security/csp-report.
 *
 * The policy body still allows 'unsafe-inline' and 'unsafe-eval'. Do not remove
 * them in this pass. AZURA_CSP_MODE=enforce turns the same body into a blocking
 * header. AZURA_CSP_MODE=report is the rollback.
 */
export const DEFAULT_CSP_MODE: CspMode = "report";

export const CSP_MEASUREMENT_ROUTES = [
  "/",
  "/account/login",
  "/admin/login",
  "/setup",
] as const;

/**
 * Explicit AZURA_CSP_MODE wins. Otherwise stay on report, including production,
 * until the measurement window above has been reviewed.
 */
export function resolveCspMode(raw: string | undefined, _nodeEnv?: string | undefined): CspMode {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "enforce") return "enforce";
  if (value === "report" || value === "report-only" || value === "reportonly") return "report";
  return DEFAULT_CSP_MODE;
}

/** Same decision as resolveCspMode. Kept so callers can name the site-wide mode. */
export function resolveSiteCspMode(raw: string | undefined, nodeEnv?: string | undefined): CspMode {
  return resolveCspMode(raw, nodeEnv);
}

export type BuildAzuraCspPolicyOptions = {
  /**
   * Optional `'sha256-…'` / `'nonce-…'` tokens for milestone CSP-2.
   * Appended to script-src alongside current unsafe directives until CSP-4.
   * Do not remove `'unsafe-inline'` until hashes/nonces cover all first-party inline.
   */
  scriptAuthTokens?: string[];
  /** Milestone CSP-3: omit `'unsafe-eval'` only after report volume is clean. */
  allowUnsafeEval?: boolean;
  /** Milestone CSP-4: omit script `'unsafe-inline'` only after nonce/hash coverage. */
  allowUnsafeInlineScript?: boolean;
};

/** Same policy body used for Report-Only and (when enabled) enforcing CSP. */
export function buildAzuraCspPolicy(options: BuildAzuraCspPolicyOptions = {}): string {
  const {
    scriptAuthTokens = [],
    allowUnsafeEval = true,
    allowUnsafeInlineScript = true,
  } = options;

  const scriptSrc = [
    "script-src 'self'",
    allowUnsafeInlineScript ? "'unsafe-inline'" : null,
    allowUnsafeEval ? "'unsafe-eval'" : null,
    ...scriptAuthTokens.filter(Boolean),
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://www.google.com",
    "https://www.googleadservices.com",
    "https://googleads.g.doubleclick.net",
    "https://connect.facebook.net",
    "https://www.facebook.com",
    /* Meta CAPI Param Builder (loaded via GTM / Meta Pixel) */
    "https://capi-automation.s3.us-east-2.amazonaws.com",
    /* Cloudflare Insights — if #418 text mismatches persist after deploy, disable
       Cloudflare Auto Minify → HTML (whitespace collapse breaks React hydration). */
    "https://static.cloudflareinsights.com",
    "https://snap.licdn.com",
    "https://ajax.googleapis.com",
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "media-src 'self' blob: https:",
    "style-src 'self' 'unsafe-inline' https:",
    scriptSrc,
    "worker-src 'self' blob:",
    "connect-src 'self' https: blob:",
    "frame-src 'self' https://www.googletagmanager.com https://www.google.com https://www.facebook.com",
    "report-to csp-endpoint",
  ].join("; ");
}

/** SHA-256 hash token for CSP script-src (`'sha256-…'`). For milestone CSP-2. */
export function cspSha256Token(source: string): string {
  const digest = createHash("sha256").update(source, "utf8").digest("base64");
  return `'sha256-${digest}'`;
}

export type CspHeaderEntry = { key: string; value: string };

/**
 * Always emits Report-Only. When mode is enforce, also emits Content-Security-Policy
 * with the same policy body (compatibility step — unsafe directives still present).
 */
export function buildCspHeaderEntries(mode: CspMode, policy = buildAzuraCspPolicy()): CspHeaderEntry[] {
  const entries: CspHeaderEntry[] = [
    { key: "Content-Security-Policy-Report-Only", value: policy },
  ];
  if (mode === "enforce") {
    entries.unshift({ key: "Content-Security-Policy", value: policy });
  }
  return entries;
}
