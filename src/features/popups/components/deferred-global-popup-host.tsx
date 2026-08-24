"use client";

import dynamic from "next/dynamic";
import type { ResolvedSitePopups } from "@/features/popups/resolve-site-popups";

const GlobalPopupHost = dynamic(
  () => import("@/features/popups/components/global-popup-host").then((m) => m.GlobalPopupHost),
  { ssr: false },
);

type Props = {
  settings: ResolvedSitePopups;
};

export function DeferredGlobalPopupHost({ settings }: Props) {
  if (!settings.enabled) return null;
  return <GlobalPopupHost settings={settings} />;
}

export { GlobalPopupHost };
