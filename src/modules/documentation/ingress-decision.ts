import type { ModuleIngressAccess } from "@/config/deployment-profile/site-features";

export type DocumentationMutationDecision =
  | { allow: true }
  | { allow: false; reason: Exclude<ModuleIngressAccess, "active"> };

/**
 * Pure fail-closed decision for Documentation mutations.
 * Unit-tested without Prisma — pass the access string from resolveModuleIngressAccess.
 */
export function decideDocumentationMutation(
  access: ModuleIngressAccess,
): DocumentationMutationDecision {
  if (access === "active") return { allow: true };
  return { allow: false, reason: access };
}
