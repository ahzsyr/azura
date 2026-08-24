import "server-only";

import { createExecutionContext } from "./execution-context";
import { seoPlatform } from "./seo-platform.impl";
import { seoRepository } from "@/repositories/seo.repository";
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
  await runPublishAutofillIfEnabled("CmsPage", pageId, userId);
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
  await runPublishAutofillIfEnabled("Post", postId, userId);
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

type PublishAutofillConfig = {
  automation?: {
    onPublish?: {
      enabled?: boolean;
      profileId?: string;
      applyMode?: "preview" | "fill_empty" | "replace_generated" | "overwrite_all";
      autoApply?: boolean;
    };
  };
};

async function runPublishAutofillIfEnabled(
  entityType: string,
  entityId: string,
  userId?: string
): Promise<void> {
  try {
    const global = (await seoRepository.getGlobalConfig()) as PublishAutofillConfig | null;
    const cfg = global?.automation?.onPublish;
    if (!cfg?.enabled) return;

    const locales = ["en", "ar"] as const;
    for (const locale of locales) {
      const ctx = createExecutionContext({
        entityType,
        entityId,
        locale,
        source: "publish",
        trigger: "page_save",
        mode: cfg.autoApply ? "commit" : "preview",
        userId,
      });

      const suggestion = await seoPlatform.autofill.suggest(ctx, {
        profileId: cfg.profileId ?? "conservative",
        applyMode: cfg.applyMode ?? "fill_empty",
        origin: "automation",
      });

      if (cfg.autoApply && suggestion.changeSet.fields.length > 0) {
        await seoPlatform.autofill.commit(ctx, suggestion.changeSet);
      }
    }
  } catch {
    // best-effort on publish
  }
}
