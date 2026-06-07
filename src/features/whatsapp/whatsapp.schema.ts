/** Logical corners — mirror correctly in RTL/LTR via start/end CSS. */
export type WhatsAppPosition =
  | "bottom-start"
  | "bottom-end"
  | "top-start"
  | "top-end";

export type WhatsAppButtonVariant = "gold" | "outline" | "default" | "custom";

export type WhatsAppButtonSize = "sm" | "md" | "lg";

export type WhatsAppAppearance = {
  enabled: boolean;
  backgroundColor: string;
  textColor?: string;
  iconUrl?: string | null;
  iconSize?: string;
  showIcon: boolean;
  showLabel: boolean;
  buttonVariant: WhatsAppButtonVariant;
  size: WhatsAppButtonSize;
};

export type WhatsAppFabSettings = WhatsAppAppearance & {
  position: WhatsAppPosition;
  offsetBottom?: number;
  offsetSide?: number;
};

export type WhatsAppPageButtonSettings = WhatsAppAppearance & {
  fullWidth?: boolean;
};

export type WhatsAppSettings = {
  fab: WhatsAppFabSettings;
  contactPage: WhatsAppPageButtonSettings;
  contentInquiry: WhatsAppPageButtonSettings;
};

const DEFAULT_APPEARANCE: WhatsAppAppearance = {
  enabled: true,
  backgroundColor: "#25D366",
  textColor: "#ffffff",
  iconUrl: null,
  iconSize: "1.75rem",
  showIcon: true,
  showLabel: true,
  buttonVariant: "gold",
  size: "md",
};

export const DEFAULT_WHATSAPP_SETTINGS: WhatsAppSettings = {
  fab: {
    ...DEFAULT_APPEARANCE,
    showLabel: false,
    buttonVariant: "custom",
    position: "bottom-end",
    offsetBottom: 24,
    offsetSide: 24,
  },
  contactPage: {
    ...DEFAULT_APPEARANCE,
    buttonVariant: "gold",
    fullWidth: true,
  },
  contentInquiry: {
    ...DEFAULT_APPEARANCE,
    buttonVariant: "gold",
    fullWidth: true,
  },
};

function isPosition(v: unknown): v is WhatsAppPosition {
  return (
    v === "bottom-start" ||
    v === "bottom-end" ||
    v === "top-start" ||
    v === "top-end"
  );
}

function isVariant(v: unknown): v is WhatsAppButtonVariant {
  return v === "gold" || v === "outline" || v === "default" || v === "custom";
}

function isSize(v: unknown): v is WhatsAppButtonSize {
  return v === "sm" || v === "md" || v === "lg";
}

function normalizeAppearance(
  raw: Partial<WhatsAppAppearance> | undefined,
  defaults: WhatsAppAppearance,
): WhatsAppAppearance {
  if (!raw || typeof raw !== "object") return defaults;
  return {
    enabled: raw.enabled !== false,
    backgroundColor:
      typeof raw.backgroundColor === "string" && raw.backgroundColor.trim()
        ? raw.backgroundColor.trim()
        : defaults.backgroundColor,
    textColor:
      typeof raw.textColor === "string" && raw.textColor.trim()
        ? raw.textColor.trim()
        : defaults.textColor,
    iconUrl: raw.iconUrl === null || typeof raw.iconUrl === "string" ? raw.iconUrl ?? null : defaults.iconUrl ?? null,
    iconSize:
      typeof raw.iconSize === "string" && raw.iconSize.trim()
        ? raw.iconSize.trim()
        : defaults.iconSize,
    showIcon: raw.showIcon !== false,
    showLabel: raw.showLabel !== false,
    buttonVariant: isVariant(raw.buttonVariant) ? raw.buttonVariant : defaults.buttonVariant,
    size: isSize(raw.size) ? raw.size : defaults.size,
  };
}

function normalizeFab(raw: Partial<WhatsAppFabSettings> | undefined): WhatsAppFabSettings {
  const defaults = DEFAULT_WHATSAPP_SETTINGS.fab;
  const appearance = normalizeAppearance(raw, defaults);
  const offsetBottom =
    typeof raw?.offsetBottom === "number" && Number.isFinite(raw.offsetBottom)
      ? Math.max(0, Math.round(raw.offsetBottom))
      : defaults.offsetBottom ?? 24;
  const offsetSide =
    typeof raw?.offsetSide === "number" && Number.isFinite(raw.offsetSide)
      ? Math.max(0, Math.round(raw.offsetSide))
      : defaults.offsetSide ?? 24;
  return {
    ...appearance,
    position: isPosition(raw?.position) ? raw.position : defaults.position,
    offsetBottom,
    offsetSide,
  };
}

function normalizePageButton(
  raw: Partial<WhatsAppPageButtonSettings> | undefined,
  defaults: WhatsAppPageButtonSettings,
): WhatsAppPageButtonSettings {
  const appearance = normalizeAppearance(raw, defaults);
  return {
    ...appearance,
    fullWidth: raw?.fullWidth !== false,
  };
}

export function normalizeWhatsAppSettings(raw: Partial<WhatsAppSettings> | null): WhatsAppSettings {
  if (!raw) return DEFAULT_WHATSAPP_SETTINGS;
  return {
    fab: normalizeFab(raw.fab),
    contactPage: normalizePageButton(raw.contactPage, DEFAULT_WHATSAPP_SETTINGS.contactPage),
    contentInquiry: normalizePageButton(raw.contentInquiry, DEFAULT_WHATSAPP_SETTINGS.contentInquiry),
  };
}
