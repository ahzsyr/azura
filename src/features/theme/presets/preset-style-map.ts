/** Card & border styles per catalog preset — synced from `/sample/src/presets/*.json`. */
export const PRESET_STYLE_MAP: Record<
  string,
  { cardStyle: string; borderStyle: string }
> = {
  networking: { cardStyle: "corner-bracket", borderStyle: "neon-thin" },
  gaming: { cardStyle: "sharp-cut", borderStyle: "glow-red" },
  sports: { cardStyle: "slash-corner", borderStyle: "bold-green" },
  luxury: { cardStyle: "thin-border", borderStyle: "gold-thin" },
  medical: { cardStyle: "soft-shadow", borderStyle: "light-gray" },
  agency: { cardStyle: "glassmorphism", borderStyle: "gradient-border" },
  restaurant: { cardStyle: "warm-border", borderStyle: "amber-glow" },
  education: { cardStyle: "soft-shadow", borderStyle: "indigo-soft" },
  realestate: { cardStyle: "thin-border", borderStyle: "gold-thin" },
  finance: { cardStyle: "corner-bracket", borderStyle: "green-thin" },
  fashion: { cardStyle: "sharp-cut", borderStyle: "rose-thin" },
  saas: { cardStyle: "glassmorphism", borderStyle: "violet-glow" },
  automotive: { cardStyle: "sharp-cut", borderStyle: "chrome-thin" },
  travel: { cardStyle: "corner-bracket", borderStyle: "teal-glow" },
  "enterprise-wifi": { cardStyle: "corner-bracket", borderStyle: "blue-glow" },
  "wireless-isp": { cardStyle: "corner-bracket", borderStyle: "orange-glow" },
  datacenter: { cardStyle: "corner-bracket", borderStyle: "cyan-glow" },
  "smart-home": { cardStyle: "corner-bracket", borderStyle: "teal-glow" },
  telecom: { cardStyle: "corner-bracket", borderStyle: "indigo-glow" },
  brt: { cardStyle: "corner-bracket", borderStyle: "cyan-glow" },
};
