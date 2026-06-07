"use client";

import { useMemo } from "react";
import { useStore } from "@nanostores/react";
import { routing } from "@/i18n/routing";
import { FALLBACK_LOCALES, resolvePrefixToCode, type PublicLocale } from "@/i18n/locale-config";
import { localePath } from "@/features/navigation/resolve-href";
import { localizeMenuItems } from "@/features/navigation/localize-menu";
import type { HeaderAction, HeaderWorkspace } from "@/features/navigation/types";
import { $workspace } from "@/features/navigation/header-store";
import { resolveMenuForSurface } from "@/features/navigation/menu-engine";
import { HeaderActions } from "./HeaderActions";
import { MobileNavActionsPortal } from "./MobileNavActionsPortal";
import { HeaderBrand } from "./HeaderBrand";
import { HeaderDesktopBehavior } from "./HeaderDesktopBehavior";
import { HeaderMenu } from "./HeaderMenu";
import { MobileMenuPreview } from "./MobileMenu/MobileMenuPreview";
import { PageHeaderOverlayCoordinator } from "@/features/builder/components/page-header-overlay-coordinator";
import {
  isBoxedHeaderStyle,
  resolvePageHeaderOverlay,
} from "@/features/builder/header-overlay";
import {
  menuAppearanceDataAttributes,
  menuAppearanceStyle,
  resolveMenuAppearance,
  resolveMobileMenuAppearance,
} from "@/features/navigation/header-menu-appearance";
import { NAV_MOBILE_MQ } from "@/features/navigation/nav-breakpoints";
import "./header-builder.css";

export type HeaderRendererSurface = "site" | "preview";
export type HeaderMenuPreviewMode = "live" | "editing";

interface Props {
  workspace?: HeaderWorkspace;
  localeCode?: string;
  themePreset?: string;
  searchEnabled?: boolean;
  canSwitchLocale?: boolean;
  surface?: HeaderRendererSurface;
  menuPreviewMode?: HeaderMenuPreviewMode;
  headerConfig?: {
    showSearch?: boolean;
    showCta?: boolean;
    showNav?: boolean;
    sticky?: boolean;
  };
  enabledLocales?: PublicLocale[];
}

export function HeaderRenderer({
  workspace: controlled,
  localeCode = routing.defaultLocale,
  themePreset,
  searchEnabled = true,
  canSwitchLocale = true,
  surface = "site",
  menuPreviewMode = "live",
  headerConfig,
  enabledLocales,
}: Props) {
  const storeWs = useStore($workspace);
  const workspace = controlled ?? storeWs;
  const locales = enabledLocales ?? FALLBACK_LOCALES;
  const languageCode = resolvePrefixToCode(localeCode, locales);

  const activeMenu = workspace.menusDatabase[workspace.activeMenuKey];

  const isPreviewSurface = surface === "preview";
  const useLiveMenus = !isPreviewSurface || menuPreviewMode === "live";
  const previewItems = activeMenu?.items ?? [];
  const rawDesktopItems = useLiveMenus
    ? resolveMenuForSurface(workspace, "desktop")
    : previewItems.filter((i) => i.placement === "both" || i.placement === "desktop");
  const rawMobileItems = useLiveMenus
    ? resolveMenuForSurface(workspace, "mobile")
    : previewItems.filter((i) => i.placement === "both" || i.placement === "mobile");

  const desktopItems = useMemo(
    () => localizeMenuItems(rawDesktopItems, languageCode, locales),
    [rawDesktopItems, languageCode, locales]
  );
  const mobileItems = useMemo(
    () => localizeMenuItems(rawMobileItems, languageCode, locales),
    [rawMobileItems, languageCode, locales]
  );

  const onHeaderAction = (action: HeaderAction) => {
    if (action.type === "search" && headerConfig?.showSearch !== false) {
      if (searchEnabled) {
        document.dispatchEvent(new CustomEvent("sm:open-search", { bubbles: true }));
      } else {
        window.location.assign(localePath("/search", localeCode));
      }
    } else if (action.type === "language" && canSwitchLocale) {
      document.getElementById("locale-switcher-trigger")?.click();
    } else if (action.type === "account") {
      window.location.assign(localePath("/account", localeCode));
    } else if (action.type === "custom" && action.id === "action-cta") {
      window.location.assign(localePath("/contact", localeCode));
    }

    if (typeof window !== "undefined" && window.matchMedia(NAV_MOBILE_MQ).matches) {
      document.dispatchEvent(new CustomEvent("azura:close-mobile-menu", { bubbles: true }));
    }
  };

  if (!activeMenu && !isPreviewSurface) return null;

  const { settings, branding, headerActions } = workspace;
  const menuAppearance = resolveMenuAppearance(settings);
  const mobileMenuAppearance = resolveMobileMenuAppearance(settings);
  const menuAttrs = menuAppearanceDataAttributes(menuAppearance);
  const isPreview = surface === "preview";
  const desktopModeForLayout = isPreview
    ? "static"
    : headerConfig?.sticky === false
      ? "static"
      : (settings.headerDesktopMode ?? "sticky");
  const desktopModeForBehavior =
    headerConfig?.sticky === false ? "static" : (settings.headerDesktopMode ?? "sticky");

  const workspaceHeaderOverlay =
    settings.overlayMode === "over-media" || settings.overlayMode === "transparent-until-scroll";

  const firstBlockOverlay = resolvePageHeaderOverlay(settings);
  const showFirstBlockOverlay =
    !isPreview && firstBlockOverlay?.enabled && isBoxedHeaderStyle(settings.headerStyle);

  const localeLabel = localeCode.split("-")[0].toUpperCase();
  let actionsForRender = headerActions.map((a) =>
    a.type === "language" ? { ...a, label: localeLabel } : a
  );
  if (surface === "site") {
    actionsForRender = actionsForRender.filter(
      (a) => a.type !== "language" && a.visible !== false,
    );
  }
  if (headerConfig?.showSearch === false) {
    actionsForRender = actionsForRender.filter((a) => a.type !== "search");
  }
  if (headerConfig?.showCta === false) {
    actionsForRender = actionsForRender.filter((a) => a.id !== "action-cta");
  }

  return (
    <>
      <div
        id="headerRoot"
        className={`header-root header-style-${settings.headerStyle}`}
        data-header-style={settings.headerStyle}
        data-header-workspace-version="1"
        data-header-surface={surface}
        data-header-overlay={workspaceHeaderOverlay ? "true" : undefined}
        data-overlay-mode={settings.overlayMode ?? "none"}
        data-overlay-surface={settings.overlaySurface ?? "glass"}
        data-mobile-type={settings.mobileType}
        data-mobile-nav-style={settings.mobileNavStyle ?? "minimal"}
        data-mobile-nav-animation={mobileMenuAppearance.animation}
        data-mobile-nav-density={settings.mobileNavDensity ?? "comfortable"}
        data-header-desktop={desktopModeForLayout}
        data-header-radius={settings.headerBorderRadius ?? "lg"}
        data-theme-preset={themePreset ?? undefined}
        style={menuAppearanceStyle(menuAppearance)}
        {...menuAttrs}
      >
        <div className="site-header">
          <div className="nav-container">
            <HeaderBrand branding={branding} localeCode={localeCode} />
            {headerConfig?.showNav !== false && (
              <HeaderMenu items={desktopItems} menuType={settings.menuType} localeCode={localeCode} />
            )}
            <div className="nav-actions">
              {isPreview ? (
                <div className="nav-actions__items">
                  <HeaderActions actions={actionsForRender} onActionClick={onHeaderAction} />
                </div>
              ) : (
                <MobileNavActionsPortal actions={actionsForRender} onActionClick={onHeaderAction} />
              )}
              <MobileMenuPreview
                mobileType={settings.mobileType}
                items={mobileItems}
                surface={surface}
                actions={actionsForRender}
                onActionClick={onHeaderAction}
                localeCode={localeCode}
                mobileNavStyle={settings.mobileNavStyle}
                mobileNavAnimation={mobileMenuAppearance.animation}
                mobileNavDensity={settings.mobileNavDensity}
                menuAppearance={mobileMenuAppearance}
                showIcons={settings.mobileNavShowIcons !== false}
                showArrows={settings.mobileNavShowArrows !== false}
              />
            </div>
          </div>
        </div>
      </div>
      {!isPreview ? (
        <HeaderDesktopBehavior
          mode={desktopModeForBehavior}
          overlayMode={settings.overlayMode ?? "none"}
          suppressSpacer={workspaceHeaderOverlay}
        />
      ) : null}
      {showFirstBlockOverlay && firstBlockOverlay ? (
        <PageHeaderOverlayCoordinator overlay={firstBlockOverlay} />
      ) : null}
    </>
  );
}

export default HeaderRenderer;
