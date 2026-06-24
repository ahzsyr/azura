import { isModuleEnabled } from "@/config/deployment-profile";
import { DOCUMENTATION_MODULE_ID } from "@/modules/documentation/manifest";

export function isModuleActive(): boolean {
  return isModuleEnabled(DOCUMENTATION_MODULE_ID);
}
