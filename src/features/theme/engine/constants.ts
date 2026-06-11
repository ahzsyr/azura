/** Visitor appearance mode (next-themes storage value). */
export const PUBLIC_THEME_KEY = "devi-theme-mode";

export const ADMIN_THEME_KEY = "admin-theme";

/** Active catalog preset id chosen by the visitor. */
export const PRESET_STORAGE_KEY = "devi-user-preset";

/** Serialized palette from last preset apply (instant reload without API). */
export const PRESET_COLORS_STORAGE_KEY = "devi-user-preset-colors";

/** Live visual effects override from visitor preset selection. */
export const PRESET_EFFECTS_STORAGE_KEY = "devi-user-preset-effects";

/** Full preset visual metrics snapshot (gradients, radius, shadows, blur, typography). */
export const PRESET_VISUAL_STORAGE_KEY = "devi-user-preset-visual";

/** User-created custom presets (local only). */
export const USER_PRESETS_STORAGE_KEY = "devi-user-custom-presets";

export const CURSOR_PREF_STORAGE_KEY = "devi-cursor-pref";

export const THEME_CHANGE_EVENT = "devi:theme-change";
