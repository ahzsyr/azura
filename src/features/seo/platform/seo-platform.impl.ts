import "server-only";

import { runAnalysis } from "./capabilities/analysis";
import { runGeneration } from "./capabilities/generation";
import { runRuleEvaluation, runValidation } from "./capabilities/validation";
import { runSimulation } from "./capabilities/simulation";
import { runDiffCompare, runDiffToPreviewModel } from "./capabilities/diff";
import { runAutomationPipeline } from "./layers/automation/pipeline-runner";
import { registerEngine } from "./engine-registry";
import { recommendationService } from "./services/recommendation.service";
import { autofillService } from "./services/autofill.service";
import { bulkExecutionEngine } from "./bulk/bulk-execution.engine";
import { registerPlatformDefaults } from "./register-defaults";
import { initObservabilitySubscriptions } from "./observability/observability";
import type { SeoPlatform } from "./seo-platform";

function registerDefaultEngines(): void {
  registerEngine(
    "content-engine",
    {
      id: "content-engine",
      layer: "content",
      execute: async (ctx) => runAnalysis(ctx),
    },
    { default: true }
  );
  registerEngine(
    "intelligence-engine",
    {
      id: "intelligence-engine",
      layer: "intelligence",
      execute: async (ctx, input) => {
        const snapshot = input as import("./types").ContentSnapshot;
        return runGeneration(ctx, snapshot);
      },
    },
    { default: true }
  );
  registerEngine(
    "governance-engine",
    {
      id: "governance-engine",
      layer: "governance",
      execute: async (ctx, input) =>
        runRuleEvaluation(ctx, input as import("./types").ContentSnapshot),
    },
    { default: true }
  );
  registerEngine(
    "automation-engine",
    {
      id: "automation-engine",
      layer: "automation",
      execute: async (ctx, input) =>
        runAutomationPipeline(ctx, typeof input === "string" ? input : undefined),
    },
    { default: true }
  );
}

registerPlatformDefaults();
initObservabilitySubscriptions();
registerDefaultEngines();

export const seoPlatform: SeoPlatform = {
  content: {
    analyze: runAnalysis,
  },
  intelligence: {
    generate: runGeneration,
  },
  governance: {
    validate: runValidation,
    evaluateRules: runRuleEvaluation,
  },
  recommendations: {
    build: recommendationService.build,
  },
  simulation: {
    project: runSimulation,
  },
  diff: {
    compare: runDiffCompare,
    toPreviewModel: runDiffToPreviewModel,
  },
  autofill: {
    suggest: autofillService.suggest,
    commit: autofillService.commit,
  },
  bulk: {
    count: bulkExecutionEngine.count,
    run: bulkExecutionEngine.run,
  },
  automation: {
    run: runAutomationPipeline,
  },
};
