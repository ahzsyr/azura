import type { ProviderHealthCheck, ProviderHealthReport } from "./types";

export function buildHealthReport(params: {
  providerId: string;
  connectionId?: string;
  checks: ProviderHealthCheck[];
}): ProviderHealthReport {
  const ok = params.checks.every((c) => c.ok || c.id === "rateLimited");
  const failed = params.checks.filter((c) => !c.ok && c.id !== "rateLimited");
  const summary =
    failed.length === 0
      ? "All health checks passed"
      : `Failed: ${failed.map((c) => c.id).join(", ")}`;

  return {
    providerId: params.providerId,
    connectionId: params.connectionId,
    ok,
    checks: params.checks,
    summary,
  };
}

export function checkNow(id: ProviderHealthCheck["id"], ok: boolean, message?: string): ProviderHealthCheck {
  return { id, ok, message, checkedAt: new Date().toISOString() };
}

export type { ProviderHealthCheck, ProviderHealthCheckId, ProviderHealthReport } from "./types";
