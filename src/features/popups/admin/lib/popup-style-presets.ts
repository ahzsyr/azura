import type { PopupDesign } from "@/features/popups/popup.schema";

export type PopupStylePresetId = "modern" | "soft" | "minimal" | "dark";

export type PopupStylePreset = {
  id: PopupStylePresetId;
  label: string;
  description: string;
  design: Partial<PopupDesign>;
};

const SOFT_SHADOW = "0 24px 70px rgba(10, 15, 25, 0.18)";

export const POPUP_STYLE_PRESETS: PopupStylePreset[] = [
  {
    id: "modern",
    label: "Modern",
    description: "Theme-aware premium card",
    design: {
      // Empty bg/text → follows site light/dark tokens
      backgroundColor: "",
      textColor: "",
      accentColor: "",
      borderColor: "",
      borderRadius: 22,
      borderWidth: 1,
      boxShadow: SOFT_SHADOW,
      padding: 24,
      maxWidth: 520,
      animation: "fade",
      animationDurationMs: 240,
    },
  },
  {
    id: "soft",
    label: "Soft",
    description: "Gentle radius, soft shadow",
    design: {
      backgroundColor: "",
      textColor: "",
      accentColor: "",
      borderColor: "",
      borderRadius: 24,
      borderWidth: 1,
      boxShadow: "0 18px 48px rgba(10, 15, 25, 0.12)",
      padding: 28,
      maxWidth: 540,
      animation: "scale",
      animationDurationMs: 260,
    },
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Tight, quiet borders",
    design: {
      backgroundColor: "",
      textColor: "",
      accentColor: "",
      borderColor: "",
      borderRadius: 16,
      borderWidth: 1,
      boxShadow: "0 12px 36px rgba(10, 15, 25, 0.1)",
      padding: 20,
      maxWidth: 480,
      animation: "fade",
      animationDurationMs: 220,
    },
  },
  {
    id: "dark",
    label: "Dark",
    description: "Forced dark surface",
    design: {
      backgroundColor: "#12141a",
      textColor: "#f5f5f5",
      accentColor: "",
      borderColor: "rgba(255, 255, 255, 0.1)",
      borderRadius: 22,
      borderWidth: 1,
      boxShadow: "0 28px 70px rgba(0, 0, 0, 0.45)",
      padding: 24,
      maxWidth: 520,
      animation: "slide",
      animationDurationMs: 240,
    },
  },
];

export function getPresetById(id: PopupStylePresetId): PopupStylePreset | undefined {
  return POPUP_STYLE_PRESETS.find((preset) => preset.id === id);
}
