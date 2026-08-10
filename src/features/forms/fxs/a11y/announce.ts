import { announceValidationError } from "@/platform/schema-ui/a11y/a11y-layer";

/** Announce status for screen readers via shared live region. */
export function fxsAnnounce(message: string, assertive = false): void {
  if (typeof document === "undefined") return;
  if (!assertive) {
    announceValidationError(message);
    return;
  }
  let live = document.getElementById("fxs-live-region-assertive");
  if (!live) {
    live = document.createElement("div");
    live.id = "fxs-live-region-assertive";
    live.setAttribute("aria-live", "assertive");
    live.setAttribute("class", "sr-only");
    document.body.appendChild(live);
  }
  live.textContent = "";
  // Force announcement re-fire
  requestAnimationFrame(() => {
    live!.textContent = message;
  });
}

export { announceValidationError };
