import type { CategoryScope } from "@/features/categories/types";
import { requiresScopeOwnerId } from "@/features/categories/invariants";

/** DB storage: PRODUCT uses ""; scoped domains use the owner id. */
export function toDbScopeOwnerId(scope: CategoryScope, scopeOwnerId: string | null | undefined): string {
  if (!requiresScopeOwnerId(scope)) return "";
  const id = (scopeOwnerId ?? "").trim();
  if (!id) {
    throw new Error(`Category scope ${scope} requires a non-empty scopeOwnerId`);
  }
  return id;
}

/** API/domain: PRODUCT exposes null; scoped domains expose the owner id. */
export function fromDbScopeOwnerId(scope: CategoryScope, scopeOwnerId: string): string | null {
  if (!requiresScopeOwnerId(scope)) return null;
  return scopeOwnerId || null;
}
