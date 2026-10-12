import { isModuleActive as isRuntimeModuleActive } from "@/config/deployment-profile/site-features";
import { DOCUMENTATION_MODULE_ID } from "@/modules/documentation/manifest";

export async function isModuleActive(): Promise<boolean> {
  return isRuntimeModuleActive(DOCUMENTATION_MODULE_ID);
}

export async function assertModuleActive(): Promise<void> {
  if (!(await isModuleActive())) {
    throw new Error("Documentation module is not enabled in this deployment profile");
  }
}
