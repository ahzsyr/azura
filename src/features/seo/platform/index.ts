export type { SeoPlatform } from "./seo-platform";
export { seoPlatform } from "./seo-platform.impl";
export { createExecutionContext } from "./execution-context";
export { seoEventBus } from "./event-bus/bus";
export { pluginSdk } from "./plugin-sdk";
export { registerPlatformDefaults } from "./register-defaults";
export { strategyRegistry } from "./layers/governance/schema-registry";
export { schemaRegistry } from "./layers/governance/schema-registry";
export {
  buildResolvedSeoSnapshot,
  loadResolvedSeoSnapshot,
} from "./read-path/resolved-seo-snapshot";
export {
  applyMetadataContributors,
  DEFAULT_METADATA_CONTRIBUTORS,
} from "./read-path/metadata-contributors";
export {
  runSeoAutomationHook,
  runSeoOnCmsPagePublish,
  runSeoOnPostPublish,
} from "./automation-hooks";
export { getAuditLog, explainField, getProvenance } from "./observability/observability";
export { recordCapability, recordFieldProvenance } from "./observability/observability.hooks";
export type * from "./types";
