import { isModuleActive as isRuntimeModuleActive } from "@/config/deployment-profile/site-features";
import { MARKETING_MODULE_ID } from "@/modules/marketing/manifest";

export async function isModuleActive(): Promise<boolean> {
  return isRuntimeModuleActive(MARKETING_MODULE_ID);
}
