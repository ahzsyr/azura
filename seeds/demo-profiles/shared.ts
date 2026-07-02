import type { MenuItem } from "@/features/navigation/types";

export function menuLink(
  id: string,
  label: string,
  url: string,
  _labelAr?: string
): MenuItem {
  return {
    id,
    type: "link",
    label,
    placement: "both",
    children: [],
    url,
  };
}

export const DEMO_PLACEHOLDER = "/images/placeholder.svg";

export function demoMedia(
  key: string,
  url: string,
  alt: string,
  filename?: string
) {
  return {
    key,
    url,
    filename: filename ?? `${key}.svg`,
    alt,
  };
}
