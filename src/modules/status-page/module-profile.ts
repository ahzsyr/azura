import {
  isModuleActive as isRuntimeModuleActive,
  resolveModuleIngressAccess,
} from "@/config/deployment-profile/site-features";
import { requireModulePermission } from "@/features/auth/guards";
import { STATUS_PAGE_BOUNDARY_MARKER } from "@/modules/status-page/boundary-marker";
import { STATUS_PAGE_MODULE_ID } from "@/modules/status-page/manifest";
import { decideStatusPageMutation } from "@/modules/status-page/ingress-decision";

void STATUS_PAGE_BOUNDARY_MARKER;

export async function isModuleActive(): Promise<boolean> {
  return isRuntimeModuleActive(STATUS_PAGE_MODULE_ID);
}

/** Availability UI / soft reads — fail-open via isModuleActive. */
export async function assertModuleActive(): Promise<void> {
  if (!(await isModuleActive())) {
    throw new Error("Status Page module is not enabled in this deployment profile");
  }
}

export class StatusPageMutationDeniedError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(`Status Page module is not available (${reason})`);
    this.name = "StatusPageMutationDeniedError";
    this.reason = reason;
  }
}

/** Server actions — refuse before side effects (fail-closed), then Module manage ACL. */
export async function assertStatusPageMutationAllowed(): Promise<void> {
  const access = await resolveModuleIngressAccess(STATUS_PAGE_MODULE_ID);
  const decision = decideStatusPageMutation(access);
  if (!decision.allow) throw new StatusPageMutationDeniedError(decision.reason);
  await requireModulePermission(STATUS_PAGE_MODULE_ID, "manage");
}

/** Admin read UI — Module read after availability. */
export async function assertStatusPageReadAllowed(): Promise<void> {
  await requireModulePermission(STATUS_PAGE_MODULE_ID, "read");
}
