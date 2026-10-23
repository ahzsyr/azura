import "server-only";

import type { PipelineMiddleware } from "@/platform/schema-ui/pipeline/command-bus";
import type { SubmitCommand } from "@/platform/schema-ui/manifests/types";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  FORM_SUBMIT_RATE_LIMIT,
  formSubmitRateLimitKey,
  isHoneypotTriggered,
} from "@/features/forms/platform/handlers/spam-rules";

export { FORM_SUBMIT_RATE_LIMIT, formSubmitRateLimitKey, isHoneypotTriggered } from "@/features/forms/platform/handlers/spam-rules";

/**
 * Form abuse budget. Backed by the shared Prisma rate-limit store so a second
 * app process (or a serverless instance) does not reset the budget. The old
 * in-memory Map was per-process and trivially bypassed across workers.
 */
/** Thrown when the shared limiter cannot be read. Callers must fail closed. */
export class RateLimitUnavailableError extends Error {
  constructor() {
    super("Rate limit unavailable");
    this.name = "RateLimitUnavailableError";
  }
}

export async function checkFormSubmitRateLimit(clientIp: string): Promise<boolean> {
  try {
    const result = await enforceRateLimit({
      key: formSubmitRateLimitKey(clientIp),
      limit: FORM_SUBMIT_RATE_LIMIT.limit,
      windowMs: FORM_SUBMIT_RATE_LIMIT.windowMs,
    });
    return result.allowed;
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) throw error;
    console.error("[forms] rate limit unavailable", error instanceof Error ? error.name : "unknown");
    throw new RateLimitUnavailableError();
  }
}

export const formsSpamMiddleware: PipelineMiddleware = async (ctx, next) => {
  const command = ctx.command as SubmitCommand;
  if (isHoneypotTriggered(command.context.honeypot)) {
    throw new Error("Spam detected");
  }
  if (!command.context.rateLimitChecked) {
    const clientIp = command.context.clientIp ?? "unknown";
    let allowed = false;
    try {
      allowed = await checkFormSubmitRateLimit(clientIp);
    } catch (error) {
      if (error instanceof RateLimitUnavailableError) throw error;
      throw new RateLimitUnavailableError();
    }
    if (!allowed) {
      throw new Error("Rate limit exceeded");
    }
  }
  ctx.data.spamChecked = true;
  return next();
};
