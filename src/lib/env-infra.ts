import { z } from "zod";

/**
 * Zod validation at infrastructure boundaries (Phase 5).
 * Validate env used by storage / cron / webhooks — not every process.env read.
 */

const infraEnvSchema = z.object({
  MEDIA_STORAGE: z.enum(["local", "supabase", "s3"]).default("local"),
  CRON_SECRET: z.string().min(1).optional(),
  WEBHOOK_ENDPOINTS: z.string().optional(),
  WEBHOOK_SIGNING_SECRET: z.string().min(1).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
});

export type InfraEnv = z.infer<typeof infraEnvSchema>;

export function parseInfraEnv(
  env: NodeJS.ProcessEnv = process.env,
): { ok: true; data: InfraEnv } | { ok: false; error: string } {
  const result = infraEnvSchema.safeParse({
    MEDIA_STORAGE: env.MEDIA_STORAGE?.trim() || "local",
    CRON_SECRET: env.CRON_SECRET?.trim() || undefined,
    WEBHOOK_ENDPOINTS: env.WEBHOOK_ENDPOINTS?.trim() || undefined,
    WEBHOOK_SIGNING_SECRET: env.WEBHOOK_SIGNING_SECRET?.trim() || undefined,
    NODE_ENV: env.NODE_ENV,
  });
  if (!result.success) {
    return { ok: false, error: result.error.issues.map((i) => i.message).join("; ") };
  }
  return { ok: true, data: result.data };
}

/** Fail closed when WEBHOOK_ENDPOINTS set in production without signing secret. */
export function assertWebhookSigningConfig(data?: InfraEnv): void {
  const parsed = data ? { ok: true as const, data } : parseInfraEnv();
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  const endpoints = (parsed.data.WEBHOOK_ENDPOINTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (
    parsed.data.NODE_ENV === "production" &&
    endpoints.length > 0 &&
    !parsed.data.WEBHOOK_SIGNING_SECRET
  ) {
    throw new Error(
      "WEBHOOK_SIGNING_SECRET is required in production when WEBHOOK_ENDPOINTS is set",
    );
  }
}
