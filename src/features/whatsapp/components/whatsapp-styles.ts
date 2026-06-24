import type { CSSProperties } from "react";
import type {
  WhatsAppFabSettings,
  WhatsAppPageButtonSettings,
} from "@/features/whatsapp/whatsapp.schema";

const FAB_SIZE_CLASS: Record<WhatsAppFabSettings["size"], string> = {
  sm: "h-12 w-12",
  md: "h-14 w-14",
  lg: "h-16 w-16",
};

export function getFabSizeClass(size: WhatsAppFabSettings["size"]): string {
  return FAB_SIZE_CLASS[size];
}

export function getFabPositionStyle(settings: WhatsAppFabSettings): CSSProperties {
  const offset = settings.offsetBottom ?? 28;
  const side = settings.offsetSide ?? 28;
  const style: CSSProperties = {
    ["--wa-offset-bottom" as string]: `${offset}px`,
    ["--wa-offset-side" as string]: `${side}px`,
  };

  if (settings.position.startsWith("bottom")) {
    style.bottom = `calc(var(--wa-offset-bottom) + env(safe-area-inset-bottom, 0px))`;
  } else {
    style.top = `calc(var(--wa-offset-bottom) + env(safe-area-inset-top, 0px))`;
  }

  if (settings.position.endsWith("start")) {
    style.insetInlineStart = `calc(var(--wa-offset-side) + env(safe-area-inset-left, 0px))`;
  } else {
    style.insetInlineEnd = `calc(var(--wa-offset-side) + env(safe-area-inset-right, 0px))`;
  }

  return style;
}

export function getFabPositionClassName(settings: WhatsAppFabSettings): string {
  const vertical = settings.position.startsWith("bottom") ? "anchor-bottom" : "anchor-top";
  const horizontal = settings.position.endsWith("start") ? "pos-start" : "pos-end";
  return `wa-fab-root--${vertical} wa-fab-root--${horizontal} wa-fab-root--pos-${settings.position}`;
}

export function getPageButtonVariant(
  appearance: WhatsAppPageButtonSettings,
): "gold" | "outline" | "default" {
  if (appearance.buttonVariant === "custom") return "default";
  return appearance.buttonVariant;
}

export function getCustomButtonStyle(
  appearance: WhatsAppPageButtonSettings,
): CSSProperties | undefined {
  if (appearance.buttonVariant !== "custom") return undefined;
  return {
    backgroundColor: appearance.backgroundColor,
    color: appearance.textColor ?? "#ffffff",
    borderColor: appearance.backgroundColor,
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length !== 3 && normalized.length !== 6) return null;
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const value = Number.parseInt(full, 16);
  if (Number.isNaN(value)) return null;
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function getFabStyle(settings: WhatsAppFabSettings): CSSProperties {
  const bg = settings.backgroundColor ?? "#25D366";
  const rgb = hexToRgb(bg);
  const glow = rgb ? `0 0 0 1px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.28)` : undefined;

  return {
    backgroundColor: bg,
    color: settings.textColor ?? "#ffffff",
    boxShadow: [
      "0 10px 28px -8px rgba(0, 0, 0, 0.38)",
      "0 4px 14px -4px rgba(0, 0, 0, 0.22)",
      glow,
    ]
      .filter(Boolean)
      .join(", "),
    ["--wa-fab-ring" as string]: rgb
      ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.42)`
      : "rgba(37, 211, 102, 0.42)",
  };
}

export function getFabClassName(size: WhatsAppFabSettings["size"]): string {
  return [
    "wa-fab-root",
    "wa-fab-root--interactive",
    getFabSizeClass(size),
  ].join(" ");
}
