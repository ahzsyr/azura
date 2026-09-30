import type { AppearanceMode, ResolvedAppearance } from "@/features/theme/engine/types";

/**
 * Shared appearance resolution (server + client).
 * For `system`, pass `prefersDark` on the server; on the client, matchMedia is used when available.
 */
export function resolveAppearance(
  mode: AppearanceMode,
  options?: { prefersDark?: boolean },
): ResolvedAppearance {
  if (mode === "system") {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return options?.prefersDark ? "dark" : "light";
  }
  return mode === "dark" ? "dark" : "light";
}
