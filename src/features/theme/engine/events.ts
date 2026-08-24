import { THEME_CHANGE_EVENT } from "./constants";
import { invalidateThemeStorageReadCache } from "./storage-read-cache";
import type { ThemeEngineSnapshot } from "./types";

export function dispatchThemeChange(detail?: Partial<ThemeEngineSnapshot>): void {
  if (typeof window === "undefined") return;
  invalidateThemeStorageReadCache();
  window.dispatchEvent(
    new CustomEvent(THEME_CHANGE_EVENT, {
      detail,
    }),
  );
}
