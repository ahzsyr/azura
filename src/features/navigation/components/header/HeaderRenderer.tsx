"use client";

import { useId } from "react";
import { routing } from "@/i18n/routing";
import { type PublicLocale } from "@/i18n/locale-config";
import { resolveActionHref } from "@/features/navigation/resolve-href";
import { useRouter } from "@/i18n/navigation";
import {
  isInternalHref,
  normalizeInternalNavHref,
  requiresDocumentNavigation,
} from "@/lib/navigation/internal-link";
import { accountPublicPath } from "@/features/account/account-public-path";
import type { HeaderAction, HeaderWorkspace } from "@/features/navigation/types";
import { useHeaderWorkspace } from "@/features/navigation/header-store";
import { resolveMenuForSurface } from "@/features/navigation/menu-engine";
import { HeaderActions } from "./HeaderActions";
import { MobileNavActionsPortal } from "./MobileNavActionsPortal";
import { MobileHeaderSearchButton } from "./MobileHeaderSearchButton";
import { HeaderBrand } from "./HeaderBrand";
import { HeaderDesktopBehavior } from "./HeaderDesktopBehavior";
import { HeaderMenu } from "./HeaderMenu";
import { MobileMenuHost, MobileNavBottomBar } from "./MobileMenu/MobileMenuPreview";
import { MobileMenuTrigger } from "./MobileMenu/MobileMenuTrigger";
import { requestCloseMobileMenu } from "./MobileMenu/mobile-menu-bridge";
import { PageHeaderOverlayCoordinator } from "@/features/builder/components/page-header-overlay-coordinator";
import { resolvePageHeaderOverlay } from "@/features/builder/header-overlay";
import {
  buildHeaderRootPresentation,
  isWorkspaceOverlayMode,
} from "@/features/navigation/header-root-attributes";
import { resolveMobileMenuAppearance } from "@/features/navigation/header-menu-appearance";
import { NAV_MOBILE_MQ } from "@/features/navigation/nav-breakpoints";
import {
  menuTreeForcesMobileIcons,
  resolveNavIconVisibility,
  shouldMountMobileNavIcons,
} from "@/features/navigation/nav-icon-visibility";
import { requestOpenSearch } from "@/capabilities/search/components/search-prefetch";
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
    /** Page content passes under the bar + safe-area padding (default on). */
    edgeToEdge?: boolean;
    /** surface | primary — drives the bar's colour wash (Theme Studio "Color basis"). */
    chromeTintSource?: "surface" | "primary";
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
  enabledLocales: _enabledLocales,
}: Props) {
  void _enabledLocales;
  const router = useRouter();
  const menuHostId = useId();
  const storeWs = useHeaderWorkspace();
  const workspace = controlled ?? storeWs;

  const activeMenu = workspace.menusDatabase[workspace.activeMenuKey];

  const isPreviewSurface = surface === "preview";
  const useLiveMenus = !isPreviewSurface || menuPreviewMode === "live";
  const previewItems = activeMenu?.items ?? [];
  const desktopItems = useLiveMenus
    ? resolveMenuForSurface(workspace, "desktop")
    : previewItems.filter((i) => i.placement === "both" || i.placement === "desktop");
  const mobileItems = useLiveMenus
    ? resolveMenuForSurface(workspace, "mobile")
    : previewItems.filter((i) => i.placement === "both" || i.placement === "mobile");

  const onHeaderAction = (action: HeaderAction) => {
    if (action.type === "search" && headerConfig?.showSearch !== false) {
      if (searchEnabled) {
        requestOpenSearch();
      } else {
        // Soft-navigate to the search page (no locale prefix needed — useRouter handles it).
        router.push("/search");
      }
    } else if (action.type === "language" && canSwitchLocale) {
      document.getElementById("locale-switcher-trigger")?.click();
    } else if (action.type === "account") {
      // /account redirects to sign-in or the admin dashboard; a soft
      // navigation through that redirect renders a blank page.
      window.location.assign(accountPublicPath(localeCode));
    } else if (action.type === "custom") {
      const href = resolveActionHref(action, localeCode);
      if (href) {
        if (isInternalHref(href) && !requiresDocumentNavigation(href)) {
          // Soft-navigate for internal custom action hrefs.
          router.push(normalizeInternalNavHref(href) as string);
        } else {
          // External or mailto — keep hard navigation.
          window.location.assign(href);
        }
      }
    }

    if (typeof window !== "undefined" && window.matchMedia(NAV_MOBILE_MQ).matches) {
      requestCloseMobileMenu(menuHostId);
    }
  };

  if (!activeMenu && !isPreviewSurface) return null;

  const { settings, branding, headerActions } = workspace;
  const isPreview = surface === "preview";
  const desktopModeForBehavior =
    headerConfig?.sticky === false ? "static" : (settings.headerDesktopMode ?? "sticky");

  const workspaceHeaderOverlay = isWorkspaceOverlayMode(settings.overlayMode);

  const firstBlockOverlay = resolvePageHeaderOverlay(settings);
  const showFirstBlockOverlay = !isPreview && firstBlockOverlay?.enabled;

  const headerRoot = buildHeaderRootPresentation({
    workspace,
    surface,
    themePreset,
    sticky: headerConfig?.sticky,
    edgeToEdge: headerConfig?.edgeToEdge,
    chromeTintSource: headerConfig?.chromeTintSource,
  });
  const mobileMenuAppearance = resolveMobileMenuAppearance(settings);
  const iconVisibility = resolveNavIconVisibility(settings);
  const showMobileIcons =
    shouldMountMobileNavIcons(iconVisibility) || menuTreeForcesMobileIcons(mobileItems);

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

  const searchAction = actionsForRender.find((a) => a.type === "search" && a.visible !== false);
  const showMobileHeaderSearch =
    Boolean(searchAction) &&
    searchEnabled !== false &&
    headerConfig?.showSearch !== false &&
    settings.mobileType !== "search";
  const actionsForMobileMenu = showMobileHeaderSearch
    ? actionsForRender.filter((a) => a.type !== "search")
    : actionsForRender;
  // The search trigger opens the search panel on the live site, so there is no menu to host.
  const hasMenuHost =
    settings.mobileType !== "bottom" && (settings.mobileType !== "search" || isPreview);

  return (
    <>
      <div
        id={headerRoot.id}
        className={headerRoot.className}
        style={headerRoot.style}
        {...Object.fromEntries(
          Object.entries(headerRoot.dataAttributes).filter(([, value]) => value !== undefined),
        )}
      >
        <div className="site-header">
          <div className="nav-container">
            <HeaderBrand branding={branding} localeCode={localeCode} />
            {headerConfig?.showNav !== false && (
              <HeaderMenu
                items={desktopItems}
                menuType={settings.menuType}
                localeCode={localeCode}
                iconVisibility={iconVisibility}
              />
            )}
            <div className="nav-actions">
              {isPreview ? (
                <div className="nav-actions__items">
                  <HeaderActions
                    actions={actionsForRender}
                    localeCode={localeCode}
                    onActionClick={onHeaderAction}
                  />
                </div>
              ) : (
                <MobileNavActionsPortal
                  actions={actionsForRender}
                  localeCode={localeCode}
                  onActionClick={onHeaderAction}
                />
              )}
              {showMobileHeaderSearch ? (
                <MobileHeaderSearchButton
                  label={searchAction?.label || "Search"}
                  iconClass={searchAction?.icon || "fa-search"}
                />
              ) : null}
              {settings.mobileType === "bottom" ? (
                <MobileNavBottomBar
                  items={mobileItems}
                  surface={surface}
                  localeCode={localeCode}
                  showIcons={showMobileIcons}
                  iconVisibility={iconVisibility}
                />
              ) : (
                <MobileMenuTrigger
                  hostId={menuHostId}
                  mobileType={settings.mobileType}
                  surface={surface}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      {hasMenuHost ? (
        <MobileMenuHost
          hostId={menuHostId}
          mobileType={settings.mobileType}
          items={mobileItems}
          surface={surface}
          actions={actionsForMobileMenu}
          onActionClick={onHeaderAction}
          localeCode={localeCode}
          mobileNavStyle={settings.mobileNavStyle}
          mobileNavAnimation={mobileMenuAppearance.animation}
          mobileNavDensity={settings.mobileNavDensity}
          menuAppearance={mobileMenuAppearance}
          showIcons={showMobileIcons}
          iconVisibility={iconVisibility}
          showArrows={settings.mobileNavShowArrows !== false}
          edgeSwipe={settings.mobileNavEdgeSwipe !== false}
        />
      ) : null}
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
