import { isModuleActive as isRuntimeModuleActive } from "@/config/deployment-profile/site-features";
import { STATUS_PAGE_MODULE_ID } from "@/modules/status-page/manifest";

export async function isModuleActive(): Promise<boolean> {
  return isRuntimeModuleActive(STATUS_PAGE_MODULE_ID);
}

export async function assertModuleActive(): Promise<void> {
  if (!(await isModuleActive())) {
    throw new Error("Status Page module is not enabled in this deployment profile");
  }
}
