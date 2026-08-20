import { isModuleEnabled } from "@/config/deployment-profile";
import { MARKETING_MODULE_ID } from "@/modules/marketing/manifest";

export function isModuleActive(): boolean {
  return isModuleEnabled(MARKETING_MODULE_ID);
}
