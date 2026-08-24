"use client";

import dynamic from "next/dynamic";
import type { PublicLocale } from "@/i18n/locale-config";
import type { HeaderWorkspace } from "@/features/navigation/types";
import type { HeaderThemeConfig } from "@/types/theme";
import type { LocaleOption } from "@/components/layout/locale-switcher";

const SiteHeader = dynamic(
  () => import("@/components/layout/site-header").then((m) => m.SiteHeader),
  { ssr: false },
);

type Props = {
  workspace: HeaderWorkspace;
  locale: string;
  locales?: LocaleOption[];
  enabledLocales?: PublicLocale[];
  themePreset?: string;
  headerConfig?: HeaderThemeConfig;
};

/** Defers interactive header JS until after first paint — shell renders from SSR. */
export function DeferredSiteHeader(props: Props) {
  return <SiteHeader {...props} />;
}
