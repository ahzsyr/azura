/** Border glow / weight presets — imported from Astro `/sample` presets. */
export const BORDER_STYLE_OPTIONS = [
  { value: "", label: "Default" },
  { value: "neon-thin", label: "Neon thin" },
  { value: "cyan-glow", label: "Cyan glow" },
  { value: "gold-thin", label: "Gold thin" },
  { value: "teal-glow", label: "Teal glow" },
  { value: "blue-glow", label: "Blue glow" },
  { value: "indigo-glow", label: "Indigo glow" },
  { value: "orange-glow", label: "Orange glow" },
  { value: "violet-glow", label: "Violet glow" },
  { value: "amber-glow", label: "Amber glow" },
  { value: "green-thin", label: "Green thin" },
  { value: "glow-red", label: "Glow red" },
  { value: "bold-green", label: "Bold green" },
  { value: "light-gray", label: "Light gray" },
  { value: "chrome-thin", label: "Chrome thin" },
  { value: "rose-thin", label: "Rose thin" },
  { value: "gradient-border", label: "Gradient border" },
  { value: "indigo-soft", label: "Indigo soft" },
] as const;

export type BorderStyleOption = (typeof BORDER_STYLE_OPTIONS)[number]["value"];
