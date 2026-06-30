import "server-only";
import { seoRepository } from "@/repositories/seo.repository";
import { SEO_INTEGRATION_PROVIDERS } from "./providers";
import { seoObservabilityFlags } from "@/features/seo/observability-flags";

const providerById = new Map(SEO_INTEGRATION_PROVIDERS.map((provider) => [provider.id, provider]));
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const MAX_ATTEMPTS = 5;
export const BACKOFF_MINUTES = [1, 5, 30, 120, 360] as const;
const RUNNER_LOCK_KEY = "seo-runner";
const LOCK_TTL_MS = 10 * 60_000;

function nextAttemptAt(attemptCount: number) {
  const index = Math.min(Math.max(0, attemptCount - 1), BACKOFF_MINUTES.length - 1);
  const delayMinutes = BACKOFF_MINUTES[index] ?? BACKOFF_MINUTES[BACKOFF_MINUTES.length - 1];
  return new Date(Date.now() + delayMinutes * 60_000);
}

function lockUntil() {
  return new Date(Date.now() + LOCK_TTL_MS);
}

function runnerOwner() {
  return `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function failureStatus(attemptCount: number) {
  return attemptCount >= MAX_ATTEMPTS ? "EXHAUSTED" : "FAILED";
}

function classifyProviderError(message: string, status?: number | null) {
  const lower = message.toLowerCase();
  if (status === 401 || status === 403 || lower.includes("unauthorized") || lower.includes("auth")) {
    return "unauthorized";
  }
  if (status === 429 || lower.includes("quota")) return "quota";
  if (lower.includes("rate")) return "rate_limit";
  if (lower.includes("timeout") || lower.includes("timed out")) return "timeout";
  if (status && status >= 400 && status < 500) return "validation";
  if (status && status >= 500) return "server";
  return "unknown";
}

async function recordTelemetry(data: Parameters<typeof seoRepository.recordProviderTelemetry>[0]) {
  if (!seoObservabilityFlags.seoTelemetry) return;
  await seoRepository.recordProviderTelemetry(data).catch(() => undefined);
}

export const seoSubmissionRunner = {
  async runDue(limit = 10) {
    const owner = runnerOwner();
    const acquired = await seoRepository.acquireRunnerLock({
      key: RUNNER_LOCK_KEY,
      owner,
      lockedUntil: lockUntil(),
    });
    if (!acquired) {
      return { processed: 0, skipped: true, reason: "runner-lock-held", results: [] };
    }

    const [config, jobs] = await Promise.all([
      seoRepository.getIntegrationsConfig(),
      seoRepository.listDueSubmissionJobs(limit),
    ]);
    const results: Array<{ id: string; ok: boolean; message: string }> = [];

    try {
      for (const job of jobs) {
        await seoRepository.renewRunnerLock({
          key: RUNNER_LOCK_KEY,
          owner,
          lockedUntil: lockUntil(),
        });
        const nextAttempt = job.attemptCount + 1;
        const provider = providerById.get(job.provider as keyof typeof config);
        if (!provider) {
          await recordTelemetry({
            provider: job.provider,
            eventType: failureStatus(nextAttempt),
            status: "FAILURE",
            attemptCount: nextAttempt,
            errorClass: "unknown_provider",
            jobId: job.id,
            url: job.url,
          });
          await seoRepository.updateSubmissionJob(job.id, {
            status: failureStatus(nextAttempt),
            attemptCount: nextAttempt,
            lastError: `Unknown provider: ${job.provider}`,
            scheduledAt: nextAttemptAt(nextAttempt),
          });
          results.push({ id: job.id, ok: false, message: "Unknown provider" });
          continue;
        }

        const providerConfig = config[provider.id];
        if (!provider.isConfigured(providerConfig)) {
          await recordTelemetry({
            provider: job.provider,
            eventType: failureStatus(nextAttempt),
            status: "FAILURE",
            attemptCount: nextAttempt,
            errorClass: "unauthorized",
            jobId: job.id,
            url: job.url,
          });
          await seoRepository.updateSubmissionJob(job.id, {
            status: failureStatus(nextAttempt),
            attemptCount: nextAttempt,
            lastError: "Provider is disabled or missing credentials",
            scheduledAt: nextAttemptAt(nextAttempt),
          });
          results.push({ id: job.id, ok: false, message: "Provider not configured" });
          continue;
        }

        await seoRepository.updateSubmissionJob(job.id, {
          status: "RUNNING",
          attemptCount: nextAttempt,
        });
        await recordTelemetry({
          provider: provider.id,
          eventType: "STARTED",
          status: "INFO",
          attemptCount: nextAttempt,
          jobId: job.id,
          url: job.url,
        });

        try {
          const startedAt = Date.now();
          const input = { url: job.url, siteUrl };
          const result =
            job.kind === "SITEMAP"
              ? await provider.submitSitemap(providerConfig!, input)
              : await provider.submitUrl(providerConfig!, input);
          const latencyMs = Date.now() - startedAt;
          const failedStatus = failureStatus(nextAttempt);
          await recordTelemetry({
            provider: provider.id,
            eventType: result.ok ? "COMPLETED" : failedStatus,
            status: result.ok ? "SUCCESS" : "FAILURE",
            responseCode: result.status ?? null,
            latencyMs,
            attemptCount: nextAttempt,
            errorClass: result.ok ? null : classifyProviderError(result.message, result.status),
            jobId: job.id,
            url: job.url,
          });

          await seoRepository.updateSubmissionJob(job.id, {
            status: result.ok ? "COMPLETED" : failedStatus,
            responseStatus: result.status ?? null,
            lastError: result.ok ? null : result.message,
            completedAt: result.ok ? new Date() : null,
            scheduledAt: result.ok ? new Date() : nextAttemptAt(nextAttempt),
          });
          results.push({ id: job.id, ok: result.ok, message: result.message });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await recordTelemetry({
            provider: provider.id,
            eventType: failureStatus(nextAttempt),
            status: "FAILURE",
            attemptCount: nextAttempt,
            errorClass: classifyProviderError(message),
            jobId: job.id,
            url: job.url,
          });
          await seoRepository.updateSubmissionJob(job.id, {
            status: failureStatus(nextAttempt),
            lastError: message,
            scheduledAt: nextAttemptAt(nextAttempt),
          });
          results.push({ id: job.id, ok: false, message });
        }
      }

      return { processed: results.length, skipped: false, results };
    } finally {
      await seoRepository.releaseRunnerLock({ key: RUNNER_LOCK_KEY, owner });
    }
  },
};
