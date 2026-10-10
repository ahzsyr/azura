import type { FooterContactItem, FooterContactItemType } from "../../types";

const DEFAULT_ICONS: Record<FooterContactItemType, string> = {
  phone: "phone",
  email: "mail",
  address: "mapPin",
  text: "message",
  richtext: "",
  custom: "",
};

export function defaultContactItemIcon(type: FooterContactItemType): string {
  return DEFAULT_ICONS[type] ?? "";
}

export function emptyFooterContactItem(
  type: FooterContactItemType = "phone",
): FooterContactItem {
  return {
    id: `fci-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    icon: defaultContactItemIcon(type),
    label: "",
    value: "",
    url: "",
    openInNewTab: false,
    badge: "",
  };
}
