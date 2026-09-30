import "server-only";

import type { RateLimitPort } from "@/lib/rate-limit-types";
import { prisma } from "@/lib/prisma";

/**
 * Prisma-backed rate limit store. Swap via setRateLimitPort(RedisRateLimitAdapter)
 * without changing endpoint call sites.
 */
export const prismaRateLimitPort: RateLimitPort = {
  async incrementAndCheck(key, windowMs, limit) {
    const now = Date.now();
    const windowStart = new Date(now - (now % windowMs));

    try {
      const existing = await prisma.rateLimitBucket.findUnique({ where: { bucketKey: key } });

      if (!existing || existing.windowStart.getTime() !== windowStart.getTime()) {
        await prisma.rateLimitBucket.upsert({
          where: { bucketKey: key },
          create: {
            id: `rl_${Buffer.from(key).toString("hex").slice(0, 48)}`,
            bucketKey: key,
            windowStart,
            count: 1,
          },
          update: { windowStart, count: 1 },
        });
        return { allowed: true, remaining: Math.max(0, limit - 1) };
      }

      if (existing.count >= limit) {
        return { allowed: false, remaining: 0 };
      }

      const updated = await prisma.rateLimitBucket.update({
        where: { bucketKey: key },
        data: { count: { increment: 1 } },
      });
      return { allowed: true, remaining: Math.max(0, limit - updated.count) };
    } catch {
      console.warn("[rate-limit] prisma bucket unavailable; allowing request");
      return { allowed: true, remaining: limit };
    }
  },
};
