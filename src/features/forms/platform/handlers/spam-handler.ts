import type { PipelineMiddleware } from "@/platform/schema-ui/pipeline/command-bus";
import type { SubmitCommand } from "@/platform/schema-ui/manifests/types";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 10;
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

export function isHoneypotTriggered(honeypot: unknown): boolean {
  if (honeypot == null) return false;
  return String(honeypot).trim().length > 0;
}

/** Returns true when the request is allowed. */
export function checkFormSubmitRateLimit(clientIp: string): boolean {
  const key = clientIp.trim() || "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

export function resetFormSubmitRateLimitsForTests(): void {
  rateLimitMap.clear();
}

export const formsSpamMiddleware: PipelineMiddleware = async (ctx, next) => {
  const command = ctx.command as SubmitCommand;
  if (isHoneypotTriggered(command.context.honeypot)) {
    throw new Error("Spam detected");
  }
  const clientIp = command.context.clientIp ?? "unknown";
  if (!checkFormSubmitRateLimit(clientIp)) {
    throw new Error("Rate limit exceeded");
  }
  ctx.data.spamChecked = true;
  return next();
};
