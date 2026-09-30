import type { ApplyMode } from "../../types/change-set";

export type CapabilityPipelineStep =
  | { step: "snapshot" }
  | { step: "generate"; profileId: string }
  | { step: "normalize" }
  | { step: "validate" }
  | { step: "diff" }
  | { step: "merge"; applyMode: ApplyMode }
  | { step: "publish"; when?: "commit" };

export type CapabilityPipelineId = "autofill" | "ai_rewrite" | "import" | "migration";

export type CapabilityPipelineDefinition = Readonly<{
  id: CapabilityPipelineId;
  steps: ReadonlyArray<CapabilityPipelineStep>;
}>;

export const AUTOFILL_PIPELINE: CapabilityPipelineDefinition = {
  id: "autofill",
  steps: [
    { step: "snapshot" },
    { step: "generate", profileId: "balanced" },
    { step: "normalize" },
    { step: "validate" },
    { step: "diff" },
    { step: "merge", applyMode: "preview" },
  ],
};

export const AUTOFILL_COMMIT_PIPELINE: CapabilityPipelineDefinition = {
  id: "autofill",
  steps: [
    { step: "snapshot" },
    { step: "generate", profileId: "balanced" },
    { step: "normalize" },
    { step: "validate" },
    { step: "diff" },
    { step: "merge", applyMode: "fill_empty" },
    { step: "publish", when: "commit" },
  ],
};

const pipelines = new Map<CapabilityPipelineId, CapabilityPipelineDefinition>([
  ["autofill", AUTOFILL_PIPELINE],
]);

export function registerCapabilityPipeline(def: CapabilityPipelineDefinition): void {
  pipelines.set(def.id, def);
}

export function getCapabilityPipeline(id: CapabilityPipelineId): CapabilityPipelineDefinition | undefined {
  return pipelines.get(id);
}

export function withPipelineOptions(
  def: CapabilityPipelineDefinition,
  options: { profileId?: string; applyMode?: ApplyMode; includePublish?: boolean }
): CapabilityPipelineDefinition {
  const steps = def.steps.map((s) => {
    if (s.step === "generate" && options.profileId) {
      return { ...s, profileId: options.profileId };
    }
    if (s.step === "merge" && options.applyMode) {
      return { ...s, applyMode: options.applyMode };
    }
    return s;
  });

  const hasPublish = steps.some((s) => s.step === "publish");
  if (options.includePublish && !hasPublish) {
    return Object.freeze({
      ...def,
      steps: Object.freeze([...steps, { step: "publish" as const, when: "commit" as const }]),
    });
  }

  return Object.freeze({ ...def, steps: Object.freeze(steps) });
}
