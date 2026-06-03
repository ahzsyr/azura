import { THEME_CHANGE_EVENT } from "./constants";
import type { ThemeEngineSnapshot } from "./types";

export function dispatchThemeChange(detail?: Partial<ThemeEngineSnapshot>): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(THEME_CHANGE_EVENT, {
      detail,
    }),
  );
}
