/**
 * Phase 4 — Module-owned jobs pattern (no ZIP-registered handlers, no plugin bus).
 *
 * Supported sequence for Module job / privileged cron-or-admin routes:
 * 1. Fail-closed Module ingress (`resolveModuleIngressAccess` / Module decide helper)
 * 2. Auth (admin Module permission, section, and/or cron secret)
 * 3. Run Module-owned job code under `src/modules/<id>/…`
 *
 * Reference: Marketing `src/app/api/marketing/jobs/run/route.ts` + `src/modules/marketing/jobs/`.
 * Generic Module event buses remain deferred — Marketing's internal `marketingEventBus` is Module-private.
 */

export type ModuleJobIngressAuthResult = "ok" | "unauthorized";

/**
 * Combine a Module ingress decision with an auth result.
 * Does not register handlers — callers supply both steps.
 */
export function decideModuleJobIngress(input: {
  ingressAllow: boolean;
  ingressReason?: string;
  auth: ModuleJobIngressAuthResult;
}): { allow: true } | { allow: false; reason: string } {
  if (!input.ingressAllow) {
    return { allow: false, reason: input.ingressReason ?? "module_inactive" };
  }
  if (input.auth !== "ok") {
    return { allow: false, reason: "unauthorized" };
  }
  return { allow: true };
}
