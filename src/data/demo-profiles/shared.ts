import type { MenuItem } from "@/features/navigation/types";
import { buildLabelsRecord } from "@/features/navigation/localize-menu";

export function menuLink(
  id: string,
  label: string,
  url: string,
  labelAr?: string
): MenuItem {
  return {
    id,
    type: "link",
    label,
    labels: buildLabelsRecord(label, labelAr ? { ar: labelAr } : {}),
    placement: "both",
    children: [],
    url,
  };
}

export const DEMO_PLACEHOLDER = "/images/placeholder.svg";

export function demoMedia(
  key: string,
  url: string,
  altEn: string,
  altAr: string,
  filename?: string
) {
  return {
    key,
    url,
    filename: filename ?? `${key}.svg`,
    altEn,
    altAr,
  };
}
