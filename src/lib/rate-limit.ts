import "server-only";

import type { RateLimitPort } from "@/lib/rate-limit-types";
import { prismaRateLimitPort } from "@/lib/rate-limit-prisma";

export type { RateLimitPort } from "@/lib/rate-limit-types";

let activePort: RateLimitPort = prismaRateLimitPort;

export function setRateLimitPort(port: RateLimitPort): void {
  activePort = port;
}

export function getRateLimitPort(): RateLimitPort {
  return activePort;
}

export async function enforceRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<{ allowed: boolean; remaining: number }> {
  return getRateLimitPort().incrementAndCheck(input.key, input.windowMs, input.limit);
}
