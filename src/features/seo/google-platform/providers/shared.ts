import type {
  GoogleAutomationProvider,
  GoogleGlobalSettings,
  GoogleHealthSnapshot,
  GoogleIntegrationContext,
  GoogleOperationalPolicy,
  GoogleQuotaSnapshot,
} from "../types";
import { DEFAULT_OPERATIONAL_POLICY as DEFAULT_POLICY } from "../types";

export function mergePolicy(
  global: GoogleGlobalSettings,
  serviceDefault: GoogleOperationalPolicy,
  serviceOverride?: Partial<GoogleOperationalPolicy>,
): GoogleOperationalPolicy {
  return {
    ...DEFAULT_POLICY,
    ...serviceDefault,
    cadenceMinutes: serviceOverride?.cadenceMinutes ?? serviceDefault.cadenceMinutes,
    retryCount:
      serviceOverride?.retryCount ??
      global.defaultRetryPolicy.retryCount ??
      serviceDefault.retryCount,
    retryBackoffMs:
      serviceOverride?.retryBackoffMs ??
      global.defaultRetryPolicy.retryBackoffMs ??
      serviceDefault.retryBackoffMs,
    timeoutMs:
      serviceOverride?.timeoutMs ??
      global.defaultWorkerPolicy.timeoutMs ??
      global.defaultTimeoutMs ??
      serviceDefault.timeoutMs,
    parallelRequests:
      serviceOverride?.parallelRequests ??
      global.defaultWorkerPolicy.parallelRequests ??
      serviceDefault.parallelRequests,
    workerEnabled:
      serviceOverride?.workerEnabled ??
      global.defaultWorkerPolicy.workerEnabled ??
      serviceDefault.workerEnabled,
    dryRunDefault: serviceOverride?.dryRunDefault ?? serviceDefault.dryRunDefault,
    rateLimitPerMinute:
      serviceOverride?.rateLimitPerMinute ??
      global.globalRateLimitPerMinute ??
      serviceDefault.rateLimitPerMinute,
    notificationOnFailure:
      serviceOverride?.notificationOnFailure ?? serviceDefault.notificationOnFailure,
    notificationOnQuotaWarning:
      serviceOverride?.notificationOnQuotaWarning ?? serviceDefault.notificationOnQuotaWarning,
    errorRecovery: serviceOverride?.errorRecovery ?? serviceDefault.errorRecovery,
  };
}

export function createAutomationProviderFor(
  integrationId: string,
  serviceDefault: GoogleOperationalPolicy,
): GoogleAutomationProvider {
  return {
    resolvePolicy(ctx: GoogleIntegrationContext) {
      const override =
        ctx.platform.services[integrationId as keyof typeof ctx.platform.services]?.policy;
      return mergePolicy(ctx.platform.global, serviceDefault, override);
    },
  };
}

export function basicHealth(input: {
  configured: boolean;
  authOk?: boolean;
  message: string;
  lastSuccessAt?: string | null;
  workerEnabled?: boolean;
  backlog?: number;
  errorRate?: number;
}): GoogleHealthSnapshot {
  const authentication = !input.configured
    ? "missing"
    : input.authOk === false
      ? "error"
      : "ok";
  const score = !input.configured
    ? 0
    : authentication === "ok"
      ? Math.max(40, 100 - Math.round((input.errorRate ?? 0) * 100) - (input.backlog ?? 0))
      : 25;
  return {
    score: Math.min(100, Math.max(0, score)),
    authentication,
    quotaPressure: "unknown",
    lastSuccessAt: input.lastSuccessAt ?? null,
    errorRate: input.errorRate ?? 0,
    latencyMs: null,
    workerState: input.workerEnabled === false ? "disabled" : input.configured ? "running" : "stopped",
    jobBacklog: input.backlog ?? 0,
    message: input.message,
  };
}

export function basicQuota(input: {
  label: string;
  current: number;
  maximum: number;
  unit?: string;
  resetAt?: string | null;
}): GoogleQuotaSnapshot {
  return {
    label: input.label,
    current: input.current,
    maximum: input.maximum,
    resetAt: input.resetAt ?? null,
    warningThreshold: Math.floor(input.maximum * 0.75),
    criticalThreshold: Math.floor(input.maximum * 0.9),
    unit: input.unit,
  };
}

export function getServiceConfig(
  ctx: GoogleIntegrationContext,
  integrationId: string,
): Record<string, string | number | boolean | null | undefined> {
  return ctx.platform.services[integrationId as keyof typeof ctx.platform.services]?.configuration ?? {};
}

export function legacyGoogle(ctx: GoogleIntegrationContext): Record<string, unknown> {
  return (ctx.legacyIntegrations?.google ?? {}) as Record<string, unknown>;
}

export function legacyIndexNow(ctx: GoogleIntegrationContext): Record<string, unknown> {
  return (ctx.legacyIntegrations?.indexnow ?? {}) as Record<string, unknown>;
}

export function hasLegacyBearer(google: Record<string, unknown>): boolean {
  return Boolean(
    (typeof google.bearerToken === "string" && google.bearerToken.trim()) ||
      (typeof google.refreshToken === "string" && google.refreshToken.trim()) ||
      google.hasBearerToken === true ||
      google.hasRefreshToken === true,
  );
}

export function hasLegacyServiceAccount(google: Record<string, unknown>): boolean {
  return Boolean(
    (typeof google.serviceAccountJson === "string" && google.serviceAccountJson.trim()) ||
      google.hasServiceAccountJson === true,
  );
}

export function hasLegacyApiKey(config: Record<string, unknown>): boolean {
  return Boolean(
    (typeof config.apiKey === "string" && config.apiKey.trim()) || config.hasApiKey === true,
  );
}
