"use client";

import { type ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import {
  isChromeVisible,
  type ChromeVisibilitySettings,
} from "@/lib/theme/chrome-visibility";

type Props = {
  settings?: ChromeVisibilitySettings | null;
  children: ReactNode;
};

/** Hides site header or footer based on theme chrome visibility settings. */
export function SiteChromeGate({ settings, children }: Props) {
  const pathname = usePathname();
  if (!isChromeVisible(settings, pathname || "/")) return null;
  return children;
}
