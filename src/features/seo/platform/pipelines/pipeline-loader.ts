import { prisma } from "@/lib/prisma";
import { SEO_PIPELINES_NAMESPACE } from "@/features/seo/constants";
import type { PipelineDefinition } from "../types";

export const DEFAULT_PIPELINES: PipelineDefinition[] = [
  {
    id: "standard-publish",
    trigger: "page_save",
    steps: [
      { kind: "capability", capability: "analysis" },
      { kind: "capability", capability: "generation" },
      { kind: "capability", capability: "validation", onCritical: "halt" },
      { kind: "service", service: "recommendations" },
      { kind: "gate", gate: "approval", requiredWhen: { source: "publish" } },
      { kind: "capability", capability: "publishing", onCritical: "halt" },
      { kind: "event", event: "submit" },
    ],
  },
  {
    id: "standard-bulk",
    trigger: "bulk_fill",
    steps: [
      { kind: "capability", capability: "analysis" },
      { kind: "capability", capability: "generation" },
      { kind: "capability", capability: "validation" },
      { kind: "service", service: "recommendations" },
      { kind: "capability", capability: "publishing" },
    ],
  },
  {
    id: "validate-only",
    steps: [
      { kind: "capability", capability: "analysis" },
      { kind: "capability", capability: "validation" },
      { kind: "service", service: "recommendations" },
    ],
  },
];

export async function loadPipeline(id: string): Promise<PipelineDefinition | undefined> {
  try {
    const row = await prisma.jsonStore.findUnique({
      where: {
        namespace_key: { namespace: SEO_PIPELINES_NAMESPACE, key: id },
      },
    });
    if (row?.data) return row.data as unknown as PipelineDefinition;
  } catch {
    // fall through
  }
  return DEFAULT_PIPELINES.find((p) => p.id === id);
}

export function resolvePipelineId(
  ctx: import("../types").SeoExecutionContext,
  explicit?: string
): string {
  if (explicit) return explicit;
  if (ctx.source === "bulk" || ctx.trigger === "bulk_fill") return "standard-bulk";
  if (ctx.source === "publish") return "standard-publish";
  return "validate-only";
}
