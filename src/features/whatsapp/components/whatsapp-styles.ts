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
  const offset = settings.offsetBottom ?? 24;
  const side = settings.offsetSide ?? 24;
  const style: CSSProperties = {};

  if (settings.position.startsWith("bottom")) {
    style.bottom = offset;
  } else {
    style.top = offset;
  }

  if (settings.position.endsWith("start")) {
    style.insetInlineStart = side;
  } else {
    style.insetInlineEnd = side;
  }

  return style;
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

export function getFabStyle(settings: WhatsAppFabSettings): CSSProperties {
  return {
    backgroundColor: settings.backgroundColor,
    color: settings.textColor ?? "#ffffff",
  };
}
