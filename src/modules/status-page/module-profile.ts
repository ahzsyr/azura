import { isModuleEnabled } from "@/config/deployment-profile";
import { STATUS_PAGE_MODULE_ID } from "@/modules/status-page/manifest";

export function isModuleActive(): boolean {
  return isModuleEnabled(STATUS_PAGE_MODULE_ID);
}
