import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { findProvider } from "@/modules/marketing/core/registry";
import { marketingSyncState } from "@/modules/marketing/core/sync";
import { marketingEventBus } from "@/modules/marketing/core/events";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
export async function syncProviderAnalytics(params: {
  providerId: string;
  connectionId: string;
  accountId: string;
  externalAccountId: string;
  from: string;
  to: string;
}) {
  marketingSyncState.markAttempt(params.providerId, "analytics", params.accountId);
  const adapter = findProvider(params.providerId);
  if (!adapter?.fetchAnalytics) {
    marketingSyncState.markFailure(params.providerId, "analytics", "Unsupported", params.accountId);
    throw new Error(`Provider ${params.providerId} does not support analytics`);
  }

  const metrics = await adapter.fetchAnalytics(params.connectionId, params.externalAccountId, {
    from: params.from,
    to: params.to,
  });

  for (const metric of metrics) {
    await prisma.marketingAnalyticsSnapshot.upsert({
      where: {
        providerId_accountId_metric_periodStart_periodEnd: {
          providerId: metric.providerId,
          accountId: metric.accountId,
          metric: metric.metric,
          periodStart: new Date(metric.periodStart),
          periodEnd: new Date(metric.periodEnd),
        },
      },
      create: {
        providerId: metric.providerId,
        accountId: metric.accountId,
        metric: metric.metric,
        value: metric.value,
        periodStart: new Date(metric.periodStart),
        periodEnd: new Date(metric.periodEnd),
        dimensions: asJson(metric.dimensions ?? {}),
      },
      update: {
        value: metric.value,
        dimensions: asJson(metric.dimensions ?? {}),
      },
    });
  }

  marketingSyncState.markSuccess(params.providerId, "analytics", params.accountId);
  await marketingEventBus.emit("ANALYTICS_SYNC_COMPLETED", {
    providerId: params.providerId,
    accountId: params.accountId,
    metricCount: metrics.length,
  });

  return metrics;
}
