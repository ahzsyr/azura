import type { ThemePreset } from "@prisma/client";

export const THEME_PRESET_LABELS: Record<ThemePreset, string> = {
  CLASSIC: "Classic",
  MODERN: "Modern",
  LUXURY: "Luxury",
  CUSTOM: "Custom",
};

export const GOOGLE_FONT_OPTIONS = [
  "Plus Jakarta Sans",
  "Inter",
  "DM Sans",
  "Outfit",
  "Amiri",
  "Playfair Display",
  "Cormorant Garamond",
  "Noto Naskh Arabic",
  "Cairo",
  "Tajawal",
] as const;

export const BASE_FONT_SIZE_OPTIONS = ["14px", "15px", "16px", "17px", "18px"] as const;

export const FOOTER_COLUMN_OPTIONS = [2, 3, 4] as const;
