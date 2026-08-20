export { MARKETING_MODULE_ID } from "@/modules/marketing/manifest";
export { isModuleActive as isMarketingModuleActive } from "@/modules/marketing/module-profile";
export { bootstrapMarketingModule } from "@/modules/marketing/bootstrap";
export { marketingService } from "@/modules/marketing/service";
export { marketingEventBus, MARKETING_EVENTS } from "@/modules/marketing/core/events";
export {
  listProviders,
  findProvider,
  findByCapability,
  supports,
  listCapabilities,
} from "@/modules/marketing/core/registry";
export type { MarketingCapabilityId } from "@/modules/marketing/core/capabilities/types";
