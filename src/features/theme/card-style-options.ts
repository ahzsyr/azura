/** Card surface presets — imported from Astro `/sample` presets.
 * Labels describe the opaque surface (Gate 2+); storage values unchanged.
 * Rename-with-migration for liquid-glass/glassmorphism keys is backlogged. */
export const CARD_STYLE_OPTIONS = [
  { value: "", label: "Default" },
  { value: "corner-bracket", label: "Corner bracket" },
  { value: "glassmorphism", label: "Lifted surface (opaque)" },
  { value: "liquid-glass", label: "Soft surface (opaque)" },
  { value: "sharp-cut", label: "Sharp cut" },
  { value: "thin-border", label: "Thin border" },
  { value: "soft-shadow", label: "Soft shadow" },
  { value: "warm-border", label: "Warm border" },
  { value: "slash-corner", label: "Slash corner" },
] as const;

export type CardStyleOption = (typeof CARD_STYLE_OPTIONS)[number]["value"];

export { BORDER_STYLE_OPTIONS } from "./border-style-options";
