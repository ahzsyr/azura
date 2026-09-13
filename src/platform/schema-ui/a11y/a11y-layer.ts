import type { ValueBinding } from "../schema/value-binding";
import type { UIComponentManifest } from "../manifests/types";

export function getA11yProps(
  binding: ValueBinding,
  manifest: UIComponentManifest | undefined,
  state: { error?: string; required?: boolean },
): Record<string, string | boolean | undefined> {
  const custom = manifest?.renderer.getA11yProps?.(binding) ?? {};
  const label = String(binding.presentation.label ?? binding.bindingId);
  return {
    "aria-label": label,
    "aria-required": state.required ?? binding.behavior.required === true,
    "aria-invalid": Boolean(state.error),
    ...custom,
  };
}

export function announceValidationError(message: string): void {
  if (typeof document === "undefined") return;
  let live = document.getElementById("schema-ui-live-region");
  if (!live) {
    live = document.createElement("div");
    live.id = "schema-ui-live-region";
    live.setAttribute("aria-live", "polite");
    live.setAttribute("class", "sr-only");
    document.body.appendChild(live);
  }
  live.textContent = message;
}
