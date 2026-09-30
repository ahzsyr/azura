import "server-only";

export type RateLimitPort = {
  incrementAndCheck(
    key: string,
    windowMs: number,
    limit: number,
  ): Promise<{ allowed: boolean; remaining: number }>;
};
