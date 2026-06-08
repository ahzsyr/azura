/** Card surface presets — imported from Astro `/sample` presets. */
export const CARD_STYLE_OPTIONS = [
  { value: "", label: "Default" },
  { value: "corner-bracket", label: "Corner bracket" },
  { value: "glassmorphism", label: "Glassmorphism" },
  { value: "liquid-glass", label: "Liquid Glass" },
  { value: "sharp-cut", label: "Sharp cut" },
  { value: "thin-border", label: "Thin border" },
  { value: "soft-shadow", label: "Soft shadow" },
  { value: "warm-border", label: "Warm border" },
  { value: "slash-corner", label: "Slash corner" },
] as const;

export type CardStyleOption = (typeof CARD_STYLE_OPTIONS)[number]["value"];

export { BORDER_STYLE_OPTIONS } from "./border-style-options";
