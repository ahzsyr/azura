/**
 * Runtime developer contract for admin pages.
 * expectedActions lives here (not in the CI inventory).
 */

import type { PageActions } from "@/stores/admin-ui-store";
import {
  getRegisteredActionKeys,
  type RegisteredActionKey,
} from "@/stores/admin-action-registry";

export type AdminPageMode =
  | "dashboard"
  | "list"
  | "editor"
  | "settings"
  | "utility"
  | "readOnly";

export type AdminActionKey = RegisteredActionKey;

export type ActionExpectation = "required" | "conditional" | "optional";

export type AdminActionExpectations = Partial<Record<AdminActionKey, ActionExpectation>>;

export type AdminPageConfig = {
  mode: AdminPageMode;
  expectedActions?: AdminActionExpectations;
};

export const ACTIONLESS_DASHBOARD: AdminPageConfig = {
  mode: "dashboard",
  expectedActions: {},
};

export const ACTIONLESS_READONLY: AdminPageConfig = {
  mode: "readOnly",
  expectedActions: {},
};

/** Modes that expect top-bar actions by default when required keys are declared. */
export function modeExpectsActions(mode: AdminPageMode): boolean {
  return mode === "editor" || mode === "settings" || mode === "utility" || mode === "list";
}

/**
 * Returns required action keys that have no registered handler.
 * Conditional/optional absences are ignored. Disabled (canX: false) still counts as registered.
 */
export function getMissingRequiredActions(
  config: AdminPageConfig | null | undefined,
  actions: PageActions,
): AdminActionKey[] {
  if (!config?.expectedActions) return [];
  if (!modeExpectsActions(config.mode) && Object.keys(config.expectedActions).length === 0) {
    return [];
  }

  const registered = new Set(getRegisteredActionKeys(actions));
  const missing: AdminActionKey[] = [];

  for (const [key, expectation] of Object.entries(config.expectedActions) as [
    AdminActionKey,
    ActionExpectation,
  ][]) {
    if (expectation !== "required") continue;
    if (!registered.has(key)) {
      missing.push(key);
    }
  }
  return missing;
}
