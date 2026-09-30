export type QuotaBucket = {
  providerId: string;
  remaining: number;
  dailyLimit: number;
  burstLimit: number;
  retryAfterMs: number;
  resetAt: string;
};

type QuotaInternal = QuotaBucket & { windowStartedAt: number };

const quotas = new Map<string, QuotaInternal>();

function ensure(providerId: string, dailyLimit = 5000, burstLimit = 50): QuotaInternal {
  const existing = quotas.get(providerId);
  if (existing) return existing;
  const now = Date.now();
  const created: QuotaInternal = {
    providerId,
    remaining: dailyLimit,
    dailyLimit,
    burstLimit,
    retryAfterMs: 0,
    resetAt: new Date(now + 24 * 60 * 60_000).toISOString(),
    windowStartedAt: now,
  };
  quotas.set(providerId, created);
  return created;
}

export const providerQuotaService = {
  get(providerId: string): QuotaBucket {
    const q = ensure(providerId);
    return {
      providerId: q.providerId,
      remaining: q.remaining,
      dailyLimit: q.dailyLimit,
      burstLimit: q.burstLimit,
      retryAfterMs: Math.max(0, q.retryAfterMs - (Date.now() - q.windowStartedAt)),
      resetAt: q.resetAt,
    };
  },

  canProceed(providerId: string): boolean {
    const q = this.get(providerId);
    if (q.retryAfterMs > 0) return false;
    return q.remaining > 0;
  },

  consume(providerId: string, count = 1): QuotaBucket {
    const q = ensure(providerId);
    q.remaining = Math.max(0, q.remaining - count);
    return this.get(providerId);
  },

  applyRetryAfter(providerId: string, retryAfterMs: number) {
    const q = ensure(providerId);
    q.retryAfterMs = retryAfterMs;
    q.windowStartedAt = Date.now();
    return this.get(providerId);
  },

  adaptiveBackoffMs(attempt: number, baseMs = 1000, maxMs = 60_000): number {
    const exp = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt - 1));
    const jitter = Math.floor(Math.random() * Math.min(250, exp / 4));
    return exp + jitter;
  },

  clear() {
    quotas.clear();
  },
};
