export type MarketingTelemetryRecord = {
  id: string;
  providerId: string;
  operation: string;
  durationMs: number;
  retryCount: number;
  rateLimited: boolean;
  queueWaitMs?: number;
  outcome: "success" | "failure";
  errorCategory?: string;
  createdAt: string;
};

const records: MarketingTelemetryRecord[] = [];

export const marketingObservability = {
  record(input: Omit<MarketingTelemetryRecord, "id" | "createdAt">) {
    const row: MarketingTelemetryRecord = {
      ...input,
      id: `tel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    records.push(row);
    if (records.length > 2000) records.shift();
    return row;
  },

  list(limit = 100): MarketingTelemetryRecord[] {
    return records.slice(-limit);
  },

  summary(providerId?: string) {
    const rows = providerId ? records.filter((r) => r.providerId === providerId) : records;
    const success = rows.filter((r) => r.outcome === "success").length;
    const failure = rows.filter((r) => r.outcome === "failure").length;
    const avgDuration =
      rows.length === 0 ? 0 : rows.reduce((sum, r) => sum + r.durationMs, 0) / rows.length;
    return {
      total: rows.length,
      success,
      failure,
      successRate: rows.length === 0 ? 0 : success / rows.length,
      avgDurationMs: avgDuration,
      rateLimitedCount: rows.filter((r) => r.rateLimited).length,
    };
  },

  clear() {
    records.length = 0;
  },
};
