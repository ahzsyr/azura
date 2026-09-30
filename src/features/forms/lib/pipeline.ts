import type { FormPipelineConfig, FormTemplateDefinition } from "@/features/forms/types";

export type SubmissionEntityRefs = {
  pipelineType?: string;
  assigneeId?: string;
  tags: string[];
  customerId?: string;
  companyId?: string;
  campaignId?: string;
};

export { resolveSubmissionEntityRefs } from "./routing";

export function parsePipelineConfig(raw: unknown): FormPipelineConfig | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const pipeline = raw as Record<string, unknown>;
  const config: FormPipelineConfig = {};
  if (typeof pipeline.pipelineType === "string" && pipeline.pipelineType.trim()) {
    config.pipelineType = pipeline.pipelineType.trim();
  }
  if (typeof pipeline.defaultAssigneeId === "string" && pipeline.defaultAssigneeId.trim()) {
    config.defaultAssigneeId = pipeline.defaultAssigneeId.trim();
  }
  if (Array.isArray(pipeline.defaultTags)) {
    config.defaultTags = pipeline.defaultTags.filter((t): t is string => typeof t === "string");
  }
  if (typeof pipeline.defaultCustomerId === "string" && pipeline.defaultCustomerId.trim()) {
    config.defaultCustomerId = pipeline.defaultCustomerId.trim();
  }
  if (typeof pipeline.defaultCompanyId === "string" && pipeline.defaultCompanyId.trim()) {
    config.defaultCompanyId = pipeline.defaultCompanyId.trim();
  }
  if (typeof pipeline.defaultCampaignId === "string" && pipeline.defaultCampaignId.trim()) {
    config.defaultCampaignId = pipeline.defaultCampaignId.trim();
  }
  return Object.keys(config).length > 0 ? config : undefined;
}

export function parseRoutingRules(raw: unknown): FormTemplateDefinition["routingRules"] {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .filter((r): r is Record<string, unknown> => Boolean(r && typeof r === "object"))
    .map((r) => ({
      id: String(r.id ?? `rule-${Math.random().toString(36).slice(2, 8)}`),
      condition: String(r.condition ?? ""),
      assigneeId: typeof r.assigneeId === "string" ? r.assigneeId : undefined,
      pipelineType: typeof r.pipelineType === "string" ? r.pipelineType : undefined,
      tags: Array.isArray(r.tags) ? r.tags.filter((t): t is string => typeof t === "string") : undefined,
      customerId: typeof r.customerId === "string" ? r.customerId : undefined,
      companyId: typeof r.companyId === "string" ? r.companyId : undefined,
      campaignId: typeof r.campaignId === "string" ? r.campaignId : undefined,
    }));
}

export function parseDestinations(raw: unknown): FormTemplateDefinition["destinations"] {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .filter((d): d is Record<string, unknown> => Boolean(d && typeof d === "object"))
    .map((d) => ({
      type: d.type === "slack" || d.type === "email" ? d.type : "email",
      webhookUrl: typeof d.webhookUrl === "string" ? d.webhookUrl : undefined,
      emails: Array.isArray(d.emails)
        ? d.emails.filter((e): e is string => typeof e === "string")
        : undefined,
    }));
}
