import "server-only";

import { isAdminNavItemEnabled } from "@/config/deployment-profile";
import { DIAGNOSTIC_CHECKS } from "./checks";
import type { DiagnosticReport, DiagnosticResult } from "./types";

export const diagnosticsEngine = {
  /**
   * Run all registered checks in parallel, skipping those gated by an inactive
   * deployment profile feature.
   */
  async runAll(): Promise<DiagnosticReport> {
    const start = Date.now();

    const results: DiagnosticResult[] = await Promise.all(
      DIAGNOSTIC_CHECKS.map(async (check) => {
        // Skip when the check's feature is disabled in the active profile
        if (check.deploymentNavItemId && !isAdminNavItemEnabled(check.deploymentNavItemId)) {
          return {
            checkId: check.id,
            status: "skipped" as const,
            message: "Feature not active in current deployment profile",
            durationMs: 0,
          };
        }
        return check.run();
      })
    );

    const summary = {
      total: results.length,
      pass: results.filter((r) => r.status === "pass").length,
      warn: results.filter((r) => r.status === "warn").length,
      fail: results.filter((r) => r.status === "fail").length,
      skipped: results.filter((r) => r.status === "skipped").length,
    };

    return {
      ranAt: new Date().toISOString(),
      durationMs: Date.now() - start,
      results,
      summary,
    };
  },

  /**
   * Run a single check by id.
   */
  async runOne(checkId: string): Promise<DiagnosticResult | null> {
    const check = DIAGNOSTIC_CHECKS.find((c) => c.id === checkId);
    if (!check) return null;
    if (check.deploymentNavItemId && !isAdminNavItemEnabled(check.deploymentNavItemId)) {
      return {
        checkId,
        status: "skipped",
        message: "Feature not active in current deployment profile",
        durationMs: 0,
      };
    }
    return check.run();
  },

  /** The ordered list of registered checks (metadata only, no run). */
  getChecks() {
    return DIAGNOSTIC_CHECKS.map(({ id, title, description, category, severity, deploymentNavItemId }) => ({
      id,
      title,
      description,
      category,
      severity,
      deploymentNavItemId,
    }));
  },
};
