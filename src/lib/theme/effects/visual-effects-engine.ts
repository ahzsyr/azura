import { backgroundEngine } from "./background-engine";
import {
  getCapabilities,
  refreshCapabilities,
  subscribeCapabilityChanges,
} from "./capability-engine";
import { cursorEngine } from "./cursor-engine";
import { collectEffectWarnings } from "./effect-tiers";
import { textEngine } from "./text-engine";
import { transitionEngine } from "./transition-engine";
import type {
  EffectEngineSnapshot,
  EffectModule,
  EffectRuntimeConfig,
} from "./types";

const MODULES: EffectModule[] = [
  backgroundEngine,
  cursorEngine,
  textEngine,
  transitionEngine,
];

let initialized = false;
let activeConfig: EffectRuntimeConfig | null = null;
let capabilityUnsubscribe: (() => void) | null = null;
let lastSnapshot: EffectEngineSnapshot | null = null;

function configSignature(config: EffectRuntimeConfig): string {
  return JSON.stringify(config);
}

function runModules(
  action: "initialize" | "update" | "destroy",
  config?: EffectRuntimeConfig,
) {
  const { policy } = getCapabilities();

  for (const mod of MODULES) {
    if (action === "initialize") mod.initialize();
    else if (action === "update" && config) mod.update(config, policy);
    else if (action === "destroy") mod.destroy();
  }
}

function buildSnapshot(config: EffectRuntimeConfig | null): EffectEngineSnapshot {
  const { capabilities, policy } = getCapabilities();
  return {
    config,
    capabilities,
    policy,
    warnings: config ? collectEffectWarnings(config, policy) : [],
  };
}

/** Isolated visual effects runtime — does not resolve theme tokens. */
export const visualEffectsEngine = {
  initialize() {
    if (initialized) return;
    initialized = true;
    refreshCapabilities();
    runModules("initialize");

    if (!capabilityUnsubscribe && typeof window !== "undefined") {
      capabilityUnsubscribe = subscribeCapabilityChanges(() => {
        if (!activeConfig) return;
        runModules("destroy");
        runModules("initialize");
        runModules("update", activeConfig);
        lastSnapshot = buildSnapshot(activeConfig);
      });
    }
  },

  /**
   * Apply a pre-resolved effect configuration.
   * Destroys and re-initializes sub-engines when the config signature changes.
   */
  update(config: EffectRuntimeConfig) {
    if (typeof document === "undefined") return;

    this.initialize();

    const signature = configSignature(config);
    const prevSignature = activeConfig ? configSignature(activeConfig) : null;

    if (prevSignature && prevSignature !== signature) {
      runModules("destroy");
      runModules("initialize");
    }

    activeConfig = config;
    runModules("update", config);
    lastSnapshot = buildSnapshot(config);

    if (lastSnapshot.warnings.length > 0 && process.env.NODE_ENV === "development") {
      for (const warning of lastSnapshot.warnings) {
        console.info(`[effects] ${warning.message}`);
      }
    }
  },

  /** Full teardown — preset reset, theme reset, or app unmount. */
  destroy() {
    if (!initialized) return;
    runModules("destroy");
    activeConfig = null;
    lastSnapshot = buildSnapshot(null);
  },

  /** Dispose capability listeners (app unmount). */
  dispose() {
    this.destroy();
    capabilityUnsubscribe?.();
    capabilityUnsubscribe = null;
    initialized = false;
  },

  getSnapshot(): EffectEngineSnapshot {
    return lastSnapshot ?? buildSnapshot(activeConfig);
  },

  getWarnings() {
    return this.getSnapshot().warnings;
  },
};
