import type {
  ProductOrderingProfile,
  ProductOrderingScopeType,
  ProductOrderingSettings,
} from "./product-ordering.schema";

export type ProductOrderingSurface =
  | "PRODUCT_LIST"
  | "BRAND"
  | "CATEGORY"
  | "COLLECTION"
  | "SEARCH"
  | "GLOBAL";

export type ProductOrderingContext = {
  /** Explicit listing surface — do not infer from shared listing helpers. */
  surface: ProductOrderingSurface;
  /** Brand name, category slug, or collection slug when applicable. */
  targetId?: string;
};

function normalizeTarget(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function profileMatches(
  profile: ProductOrderingProfile,
  type: ProductOrderingScopeType,
  targetId?: string,
): boolean {
  if (!profile.enabled) return false;
  if (profile.scope.type !== type) return false;
  if (type === "GLOBAL" || type === "PRODUCT_LIST" || type === "SEARCH") {
    return true;
  }
  const expected = normalizeTarget(profile.scope.targetId);
  const actual = normalizeTarget(targetId);
  return Boolean(expected) && expected === actual;
}

/**
 * Resolve the active ordering profile for a listing surface.
 *
 * Precedence:
 * BRAND exact → CATEGORY exact → COLLECTION exact → SEARCH → PRODUCT_LIST → GLOBAL → null
 */
export function resolveProductOrderingProfile(
  settings: ProductOrderingSettings | null | undefined,
  context: ProductOrderingContext,
): ProductOrderingProfile | null {
  const profiles = settings?.profiles ?? [];
  if (profiles.length === 0) return null;

  const targetId = context.targetId;

  const tryFind = (type: ProductOrderingScopeType, tid?: string) =>
    profiles.find((p) => profileMatches(p, type, tid)) ?? null;

  if (context.surface === "BRAND") {
    const exact = tryFind("BRAND", targetId);
    if (exact) return exact;
  } else if (context.surface === "CATEGORY") {
    const exact = tryFind("CATEGORY", targetId);
    if (exact) return exact;
  } else if (context.surface === "COLLECTION") {
    const exact = tryFind("COLLECTION", targetId);
    if (exact) return exact;
  } else if (context.surface === "SEARCH") {
    const exact = tryFind("SEARCH");
    if (exact) return exact;
  } else if (context.surface === "PRODUCT_LIST") {
    const exact = tryFind("PRODUCT_LIST");
    if (exact) return exact;
  }

  // Always allow GLOBAL fallback for any surface (including GLOBAL itself).
  return tryFind("GLOBAL");
}

/**
 * Resolve a profile by id for block-level overrides.
 * Empty / missing id → Global Ordering. Unknown or disabled id → Global fallback.
 */
export function findProductOrderingProfileById(
  settings: ProductOrderingSettings | null | undefined,
  profileId?: string | null,
): ProductOrderingProfile | null {
  const profiles = settings?.profiles ?? [];
  if (profiles.length === 0) return null;

  const global =
    profiles.find((p) => p.enabled && p.scope.type === "GLOBAL") ??
    profiles.find((p) => p.scope.type === "GLOBAL") ??
    null;

  const id = (profileId ?? "").trim();
  if (!id) return global;

  const exact = profiles.find((p) => p.id === id && p.enabled) ?? null;
  return exact ?? global;
}
