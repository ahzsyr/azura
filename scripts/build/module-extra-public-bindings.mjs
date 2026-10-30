/**
 * Extra public prefixes disabled when a Module is profile-omitted.
 * Not derived from ModuleManifest.publicRoutes (Phase 4 exceptional bindings).
 * Keep in sync with src/config/deployment-profile/module-extra-bindings.ts
 *
 * @type {Record<string, string[]>}
 */
export const MODULE_EXTRA_PUBLIC_BINDINGS = {
  /** Marketing campaign short-link App Router handler (`src/app/a/route.ts`). */
  marketing: ["/a"],
};

/** @deprecated Alias — prefer MODULE_EXTRA_PUBLIC_BINDINGS. */
export const MODULE_EXTRA_DISABLED_PUBLIC = MODULE_EXTRA_PUBLIC_BINDINGS;
