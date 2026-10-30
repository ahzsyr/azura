/**
 * Extra public prefixes disabled when a Module is profile-omitted.
 * Not a package contribution — Core-owned exceptional bindings (Phase 4).
 * Keep in sync with scripts/build/module-extra-public-bindings.mjs
 */
export const MODULE_EXTRA_PUBLIC_BINDINGS: Readonly<Record<string, readonly string[]>> = {
  /** Marketing campaign short-link (`src/app/a/route.ts`). */
  marketing: ["/a"],
};

/** @deprecated Prefer MODULE_EXTRA_PUBLIC_BINDINGS. */
export const MODULE_EXTRA_DISABLED_PUBLIC = MODULE_EXTRA_PUBLIC_BINDINGS;
