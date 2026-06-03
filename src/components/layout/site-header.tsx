"use client";

import { useEffect } from "react";
import type { HeaderWorkspace } from "@/features/navigation/types";
import { HeaderRenderer } from "@/features/navigation/components/header/HeaderRenderer";
import { setWorkspace } from "@/features/navigation/header-store";
import { SearchCommand } from "@/features/search/components/search-lazy";
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
  useEffect(() => {
    setWorkspace(workspace);
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
      {headerConfig?.showSearch !== false && (
        <div className="sr-only">
          <SearchCommand />
        </div>
      )}
    </>
  );
}
