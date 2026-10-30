import {
  isModuleActive as isRuntimeModuleActive,
  resolveModuleIngressAccess,
} from "@/config/deployment-profile/site-features";
import { requireModulePermission } from "@/features/auth/guards";
import { DOCUMENTATION_BOUNDARY_MARKER } from "@/modules/documentation/boundary-marker";
import { DOCUMENTATION_MODULE_ID } from "@/modules/documentation/manifest";
import { decideDocumentationMutation } from "@/modules/documentation/ingress-decision";

void DOCUMENTATION_BOUNDARY_MARKER;

export async function isModuleActive(): Promise<boolean> {
  return isRuntimeModuleActive(DOCUMENTATION_MODULE_ID);
}

/** Availability UI / soft reads — fail-open via isModuleActive. */
export async function assertModuleActive(): Promise<void> {
  if (!(await isModuleActive())) {
    throw new Error("Documentation module is not enabled in this deployment profile");
  }
}

export class DocumentationMutationDeniedError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(`Documentation module is not available (${reason})`);
    this.name = "DocumentationMutationDeniedError";
    this.reason = reason;
  }
}

/** Server actions — refuse before side effects (fail-closed), then Module manage ACL. */
export async function assertDocumentationMutationAllowed(): Promise<void> {
  const access = await resolveModuleIngressAccess(DOCUMENTATION_MODULE_ID);
  const decision = decideDocumentationMutation(access);
  if (!decision.allow) throw new DocumentationMutationDeniedError(decision.reason);
  await requireModulePermission(DOCUMENTATION_MODULE_ID, "manage");
}

/** Admin read UI — Module read after availability. */
export async function assertDocumentationReadAllowed(): Promise<void> {
  await requireModulePermission(DOCUMENTATION_MODULE_ID, "read");
}
