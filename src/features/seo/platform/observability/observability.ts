import { prisma } from "@/lib/prisma";
import { SEO_PROVENANCE_NAMESPACE } from "@/features/seo/constants";
import { seoEventBus } from "../event-bus/bus";
import type { FieldProvenance, ProvenanceChain, SeoExecutionContext } from "../types";

type AuditEntry = {
  id: string;
  at: string;
  ctx: Pick<SeoExecutionContext, "correlationId" | "entityType" | "entityId" | "source" | "trigger">;
  event: string;
  detail?: Record<string, unknown>;
};

const auditLog: AuditEntry[] = [];
const provenanceByCorrelation = new Map<string, FieldProvenance>();

export function attachProvenance(correlationId: string, provenance: FieldProvenance): void {
  provenanceByCorrelation.set(correlationId, provenance);
}

export function getProvenance(correlationId: string): FieldProvenance | undefined {
  return provenanceByCorrelation.get(correlationId);
}

export function getAuditLog(limit = 50): AuditEntry[] {
  return auditLog.slice(-limit);
}

async function persistProvenance(
  ctx: SeoExecutionContext,
  provenance: FieldProvenance
): Promise<void> {
  try {
    await prisma.jsonStore.upsert({
      where: {
        namespace_key: {
          namespace: SEO_PROVENANCE_NAMESPACE,
          key: `${ctx.entityType}:${ctx.entityId}`,
        },
      },
      create: {
        namespace: SEO_PROVENANCE_NAMESPACE,
        key: `${ctx.entityType}:${ctx.entityId}`,
        data: { correlationId: ctx.correlationId, provenance, at: new Date().toISOString() },
      },
      update: {
        data: { correlationId: ctx.correlationId, provenance, at: new Date().toISOString() },
      },
    });
  } catch {
    // best effort
  }
}

function record(event: string, payload: Record<string, unknown>): void {
  const ctx = payload.ctx as SeoExecutionContext | undefined;
  if (!ctx) return;
  auditLog.push({
    id: `${ctx.correlationId}-${auditLog.length}`,
    at: new Date().toISOString(),
    ctx: {
      correlationId: ctx.correlationId,
      entityType: ctx.entityType,
      entityId: ctx.entityId,
      source: ctx.source,
      trigger: ctx.trigger,
    },
    event,
    detail: payload,
  });
  if (auditLog.length > 500) auditLog.splice(0, auditLog.length - 500);
}

export function initObservabilitySubscriptions(): void {
  const events = [
    "pipeline.started",
    "snapshot.built",
    "suggestion.generated",
    "rules.evaluated",
    "validation.completed",
    "recommendations.ready",
    "persist.requested",
    "persist.completed",
    "pipeline.completed",
  ] as const;

  for (const type of events) {
    seoEventBus.on(type, async (payload) => {
      record(type, payload as Record<string, unknown>);
      if (type === "suggestion.generated") {
        const p = payload as { ctx: SeoExecutionContext; suggestion: { provenance: FieldProvenance } };
        attachProvenance(p.ctx.correlationId, p.suggestion.provenance);
        await persistProvenance(p.ctx, p.suggestion.provenance);
      }
    });
  }
}

export function explainField(
  correlationId: string,
  field: string
): ProvenanceChain | undefined {
  return getProvenance(correlationId)?.[field];
}
