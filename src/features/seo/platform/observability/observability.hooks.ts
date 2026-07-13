import type { ProvenanceChain, SeoExecutionContext } from "../types";

export type ObservabilityRecord = {
  capability: string;
  field?: string;
  chain?: ProvenanceChain;
  detail?: Record<string, unknown>;
};

const capabilityLog: Array<{ at: string; ctx: SeoExecutionContext; record: ObservabilityRecord }> = [];

export function recordObservability(
  ctx: SeoExecutionContext,
  record: ObservabilityRecord
): void {
  capabilityLog.push({ at: new Date().toISOString(), ctx, record });
  if (capabilityLog.length > 500) capabilityLog.splice(0, capabilityLog.length - 500);
}

export function recordCapability(
  ctx: SeoExecutionContext,
  capability: string,
  detail?: Record<string, unknown>
): void {
  recordObservability(ctx, { capability, detail });
}

export function recordFieldProvenance(
  ctx: SeoExecutionContext,
  field: string,
  chain: ProvenanceChain
): void {
  recordObservability(ctx, { capability: "provenance", field, chain });
}

export function getCapabilityLog(limit = 50) {
  return capabilityLog.slice(-limit);
}
