import "server-only";

import { createExecutionContext } from "./execution-context";
import { seoPlatform } from "./seo-platform.impl";
import type {
  AutomationRunResult,
  SeoExecutionMode,
  SeoExecutionSource,
  SeoExecutionTrigger,
} from "./types";

export type SeoAutomationHookInput = {
  entityType: string;
  entityId: string;
  locales?: string[];
  source?: SeoExecutionSource;
  trigger?: SeoExecutionTrigger;
  mode?: SeoExecutionMode;
  pipelineId?: string;
  userId?: string;
  strategyId?: string;
};

/**
 * Run the SEO automation pipeline for one or more locales.
 * Used by CMS publish/save hooks and cron jobs.
 */
export async function runSeoAutomationHook(
  input: SeoAutomationHookInput
): Promise<AutomationRunResult[]> {
  const locales = input.locales?.length ? input.locales : ["en", "ar"];
  const results: AutomationRunResult[] = [];

  for (const locale of locales) {
    const ctx = createExecutionContext({
      entityType: input.entityType,
      entityId: input.entityId,
      locale,
      source: input.source ?? "publish",
      trigger: input.trigger ?? "page_save",
      mode: input.mode ?? "preview",
      userId: input.userId,
      metadata: input.strategyId ? { strategyId: input.strategyId } : undefined,
    });
    results.push(await seoPlatform.automation.run(ctx, input.pipelineId));
  }

  return results;
}

export async function runSeoOnCmsPagePublish(pageId: string, userId?: string) {
  return runSeoAutomationHook({
    entityType: "CmsPage",
    entityId: pageId,
    source: "publish",
    trigger: "page_save",
    mode: "preview",
    pipelineId: "standard-publish",
    userId,
  });
}

export async function runSeoOnPostPublish(postId: string, userId?: string) {
  return runSeoAutomationHook({
    entityType: "Post",
    entityId: postId,
    source: "publish",
    trigger: "page_save",
    mode: "preview",
    pipelineId: "standard-publish",
    userId,
  });
}
