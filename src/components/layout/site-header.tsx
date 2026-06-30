"use client";

import { useLayoutEffect } from "react";
import type { HeaderWorkspace } from "@/features/navigation/types";
import { HeaderRenderer } from "@/features/navigation/components/header/HeaderRenderer";
import { setWorkspace } from "@/features/navigation/header-store";
import { DeferredSearchCommand } from "@/capabilities/search/components/deferred-search-command";
import { LocaleSwitcher, type LocaleOption } from "@/components/layout/locale-switcher";
import type { HeaderThemeConfig } from "@/types/theme";
import type { PublicLocale } from "@/i18n/locale-config";

type Props = {
  workspace: HeaderWorkspace;
  locale: string;
  locales?: LocaleOption[];
  enabledLocales?: PublicLocale[];
  themePreset?: string;
  headerConfig?: HeaderThemeConfig;
};

export function SiteHeader({
  workspace,
  locale,
  locales,
  enabledLocales,
  themePreset,
  headerConfig,
}: Props) {
  useLayoutEffect(() => {
    setWorkspace(workspace);
    const shellNodes = document.querySelectorAll<HTMLElement>("[data-header-shell]");
    shellNodes.forEach((el) => {
      // Keep SSR shell in DOM tree; removing React-owned nodes can break reconciliation.
      el.setAttribute("data-header-shell-hidden", "true");
      el.setAttribute("aria-hidden", "true");
      el.style.display = "none";
    });
  }, [workspace]);

  return (
    <>
      <LocaleSwitcher locales={locales} showInline={false} />
      <HeaderRenderer
        workspace={workspace}
        localeCode={locale}
        enabledLocales={enabledLocales}
        themePreset={themePreset}
        surface="site"
        canSwitchLocale
        headerConfig={{
          showSearch: headerConfig?.showSearch,
          showCta: headerConfig?.showCta,
          sticky: headerConfig?.sticky,
          showNav: headerConfig?.showNav,
        }}
      />
      {headerConfig?.showSearch !== false && <DeferredSearchCommand />}
    </>
  );
}
