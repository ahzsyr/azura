import type { ThemeProviderProps } from "next-themes";

/**
 * React 19 warns when next-themes renders an executable inline <script> in client trees.
 * `/public/theme-init.js` in the root layout applies the theme before hydration, so next-themes'
 * duplicate script can use a stable non-executable type on both server and client.
 */
export const NEXT_THEMES_SCRIPT_PROPS: NonNullable<ThemeProviderProps["scriptProps"]> = {
  type: "application/json",
};

export function nextThemesScriptProps(): ThemeProviderProps["scriptProps"] {
  return NEXT_THEMES_SCRIPT_PROPS;
}
