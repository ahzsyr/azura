export type DiagnosticSeverity = "error" | "warning" | "info";
export type DiagnosticCategory = "integrity" | "content" | "media" | "config";
export type DiagnosticStatus = "pass" | "warn" | "fail" | "skipped";

/** A single affected entity returned with a diagnostic result. */
export type DiagnosticItem = {
  id: string;
  label: string;
  /** Deep-link to the admin screen for this item. */
  href?: string;
};

/** Result produced by running a DiagnosticCheck. */
export type DiagnosticResult = {
  checkId: string;
  status: DiagnosticStatus;
  /** Human-readable one-line summary. */
  message: string;
  /** Number of affected records (0 for a pass). */
  count?: number;
  /** Affected items list (capped at 10 for display). */
  items?: DiagnosticItem[];
  durationMs: number;
};

/** A single registered diagnostic check. */
export type DiagnosticCheck = {
  id: string;
  title: string;
  description: string;
  category: DiagnosticCategory;
  severity: DiagnosticSeverity;
  /**
   * If set, this check is skipped when the given deployment profile feature
   * is inactive (uses `isAdminNavItemEnabled(deploymentNavItemId)`).
   */
  deploymentNavItemId?: string;
  run(): Promise<DiagnosticResult>;
};

/** Aggregated report produced by the diagnostics engine. */
export type DiagnosticReport = {
  ranAt: string;
  durationMs: number;
  results: DiagnosticResult[];
  summary: {
    total: number;
    pass: number;
    warn: number;
    fail: number;
    skipped: number;
  };
};
