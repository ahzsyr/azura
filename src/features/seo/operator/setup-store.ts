import "server-only";

import type { Prisma } from "@prisma/client";
import { jsonStoreService } from "@/features/storage/json-store.service";
import type { SeoSetupState, SeoSetupStepId } from "./types";
import { SEO_SETUP_STEPS } from "./types";

const NAMESPACE = "seo-setup";
const KEY = "state";

function emptyState(): SeoSetupState {
  return {
    complete: false,
    steps: {
      "site-information": false,
      "search-appearance": false,
      "search-engines": false,
      "seo-defaults": false,
    },
  };
}

export const seoSetupStore = {
  async get(): Promise<SeoSetupState> {
    const stored = await jsonStoreService.get<SeoSetupState>(NAMESPACE, KEY);
    if (!stored) return emptyState();
    return {
      ...emptyState(),
      ...stored,
      steps: { ...emptyState().steps, ...stored.steps },
    };
  },

  async save(state: SeoSetupState): Promise<SeoSetupState> {
    await jsonStoreService.set(NAMESPACE, KEY, state as unknown as Prisma.InputJsonValue);
    return state;
  },

  async markStep(stepId: SeoSetupStepId, done = true): Promise<SeoSetupState> {
    const current = await this.get();
    const steps = { ...current.steps, [stepId]: done };
    const allDone = SEO_SETUP_STEPS.every((step) => steps[step.id]);
    return this.save({
      ...current,
      steps,
      complete: allDone,
      completedAt: allDone ? new Date().toISOString() : current.completedAt,
    });
  },

  async complete(): Promise<SeoSetupState> {
    const current = await this.get();
    const steps = { ...current.steps };
    for (const step of SEO_SETUP_STEPS) steps[step.id] = true;
    return this.save({
      complete: true,
      skipped: false,
      completedAt: new Date().toISOString(),
      steps,
    });
  },

  async skip(): Promise<SeoSetupState> {
    const current = await this.get();
    return this.save({
      ...current,
      skipped: true,
    });
  },
};
