"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import type {
  HeaderAction,
  MenuItem,
  MobileNavAnimation,
  MobileNavDensity,
  MobileNavStyle,
  MobileNavType,
} from "@/features/navigation/types";
import type { ResolvedMobileMenuAppearance } from "@/features/navigation/header-menu-appearance";
import {
  getMobileAnimDuration,
  menuAppearanceDataAttributes,
  menuAppearanceStyle,
} from "@/features/navigation/header-menu-appearance";
import { NAV_MOBILE_MQ, NAV_MOBILE_NARROW_MAX_PX } from "@/features/navigation/nav-breakpoints";
import { getItemHref } from "@/features/navigation/resolve-href";
import type { HeaderRendererSurface } from "../HeaderRenderer";
import { HeaderActions } from "../HeaderActions";
import { NavMenuGlyph } from "../NavMenuGlyph";
import { prefetchSearchModal, requestOpenSearch } from "@/capabilities/search/components/search-prefetch";
import type { NavIconBreakpoint, NavIconVisibility } from "@/features/navigation/nav-icon-visibility";
import {
  navIconVisibilityDataAttributes,
  resolveItemShowsNavIcon,
  resolveNavIconBreakpoint,
} from "@/features/navigation/nav-icon-visibility";

type MnavAnimState = "closed" | "open" | "closing";

function subscribeViewportWidth(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("resize", onChange);
  window.addEventListener("orientationchange", onChange);
  return () => {
    window.removeEventListener("resize", onChange);
    window.removeEventListener("orientationchange", onChange);
  };
}

function getViewportWidthSnapshot() {
  return typeof window === "undefined" ? NAV_MOBILE_NARROW_MAX_PX : window.innerWidth;
}

function getViewportWidthServerSnapshot() {
  return NAV_MOBILE_NARROW_MAX_PX;
}

function useNavIconBreakpoint(): NavIconBreakpoint {
  const width = useSyncExternalStore(
    subscribeViewportWidth,
    getViewportWidthSnapshot,
    getViewportWidthServerSnapshot,
  );
  return resolveNavIconBreakpoint(width);
}

function iconSlotDecision(
  item: Pick<MenuItem, "iconPlacement">,
  breakpoint: NavIconBreakpoint,
  defaults: NavIconVisibility,
): { show: boolean; override: boolean } {
  const show = resolveItemShowsNavIcon(item.iconPlacement, breakpoint, defaults);
  return { show, override: show && !defaults[breakpoint] };
}

function anyItemShowsNavIcon(
  items: MenuItem[],
  breakpoint: NavIconBreakpoint,
  defaults: NavIconVisibility,
): boolean {
  return items.some(
    (item) =>
      iconSlotDecision(item, breakpoint, defaults).show ||
      anyItemShowsNavIcon(item.children ?? [], breakpoint, defaults),
  );
}

interface Props {
  mobileType: MobileNavType;
  items?: MenuItem[];
  surface?: HeaderRendererSurface;
  actions?: HeaderAction[];
  onActionClick?: (action: HeaderAction) => void;
  onOpen?: () => void;
  localeCode?: string;
  mobileNavStyle?: MobileNavStyle;
  mobileNavAnimation?: MobileNavAnimation;
  mobileNavDensity?: MobileNavDensity;
  menuAppearance?: ResolvedMobileMenuAppearance;
  showIcons?: boolean;
  /** Per-breakpoint icon visibility attrs for CSS (portal is outside header-root). */
  iconVisibility?: NavIconVisibility;
  showArrows?: boolean;
}

function blockPreviewNav(e: React.MouseEvent, surface?: HeaderRendererSurface) {
  if (surface === "preview") {
    e.preventDefault();
  }
}

function handleNavLinkClick(
  e: React.MouseEvent,
  surface: HeaderRendererSurface | undefined,
  onClose?: () => void,
) {
  blockPreviewNav(e, surface);
  if (surface !== "preview") onClose?.();
}

function MnavIconSlot({
  icon,
  showIcons,
  override = false,
  fallbackIcon = "fa-circle",
}: {
  icon?: string;
  showIcons: boolean;
  override?: boolean;
  fallbackIcon?: string;
}) {
  if (!showIcons) return null;
  const glyph = icon?.trim() ? icon : fallbackIcon;
  return (
    <span
      className="mnav-row__icon"
      data-nav-icon-override={override ? "show" : undefined}
      aria-hidden
    >
      <NavMenuGlyph icon={glyph} className="h-4 w-4" />
    </span>
  );
}

function MnavLabel({ children }: { children: ReactNode }) {
  return <span className="mnav-row__label">{children}</span>;
}

function MnavChevron({ show, isOpen }: { show: boolean; isOpen?: boolean }) {
  if (!show) return null;
  return (
    <span className={`mnav-row__chevron${isOpen ? " is-open" : ""}`} aria-hidden>
      <i className="fas fa-chevron-down" />
    </span>
  );
}

function mnavDepthStyle(depth: number): CSSProperties {
  return { "--mnav-depth": depth } as CSSProperties;
}

type MnavItemRowProps = {
  icon?: string;
  label: string;
  showIcons: boolean;
  iconOverride?: boolean;
  showArrows?: boolean;
  isOpen?: boolean;
  variant?: "row" | "child";
  className?: string;
};

function mnavRowClass(variant: "row" | "child", extra?: string) {
  const base = variant === "child" ? "mnav-row mnav-row--child" : "mnav-row";
  return extra ? `${base} ${extra}` : base;
}

function MnavItemRowContent({
  icon,
  label,
  showIcons,
  iconOverride,
  showArrows,
  isOpen,
  variant = "row",
}: MnavItemRowProps) {
  return (
    <>
      <MnavIconSlot icon={icon} showIcons={showIcons} override={iconOverride} />
      <MnavLabel>{label}</MnavLabel>
      {variant === "row" && showArrows != null ? (
        <MnavChevron show={showArrows} isOpen={isOpen} />
      ) : null}
    </>
  );
}

function NavRows({
  items,
  localeCode,
  surface,
  showIcons,
  iconBreakpoint,
  iconDefaults,
  showArrows,
  onClose,
}: {
  items: MenuItem[];
  localeCode: string;
  surface?: HeaderRendererSurface;
  showIcons: boolean;
  iconBreakpoint?: NavIconBreakpoint;
  iconDefaults?: NavIconVisibility;
  showArrows: boolean;
  onClose?: () => void;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <NavRowsList
      items={items}
      depth={0}
      localeCode={localeCode}
      surface={surface}
      showIcons={showIcons}
      iconBreakpoint={iconBreakpoint}
      iconDefaults={iconDefaults}
      showArrows={showArrows}
      onClose={onClose}
      openIds={openIds}
      onToggle={toggle}
    />
  );
}

function NavRowsList({
  items,
  depth,
  localeCode,
  surface,
  showIcons,
  iconBreakpoint,
  iconDefaults,
  showArrows,
  onClose,
  openIds,
  onToggle,
}: {
  items: MenuItem[];
  depth: number;
  localeCode: string;
  surface?: HeaderRendererSurface;
  showIcons: boolean;
  iconBreakpoint?: NavIconBreakpoint;
  iconDefaults?: NavIconVisibility;
  showArrows: boolean;
  onClose?: () => void;
  openIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const slotFor = (item: MenuItem) =>
    iconBreakpoint && iconDefaults
      ? iconSlotDecision(item, iconBreakpoint, iconDefaults)
      : { show: showIcons, override: false };

  const variant = depth > 0 ? "child" : "row";

  return (
    <>
      {items.map((item) =>
        item.children.length > 0 ? (
          <div
            key={item.id}
            className={`mnav-item-wrap${openIds.has(item.id) ? " is-open" : ""}`}
          >
            <div className={`mnav-parent-row${openIds.has(item.id) ? " is-open" : ""}`}>
              <a
                href={getItemHref(item, localeCode)}
                className={mnavRowClass(variant, "mnav-row--parent-link")}
                style={mnavDepthStyle(depth)}
                data-mnav-depth={depth}
                onClick={(e) => handleNavLinkClick(e, surface, onClose)}
              >
                <MnavIconSlot
                  icon={item.icon}
                  showIcons={slotFor(item).show}
                  override={slotFor(item).override}
                />
                <MnavLabel>{item.label}</MnavLabel>
              </a>
              {showArrows ? (
                <button
                  type="button"
                  className="mnav-row__toggle"
                  aria-expanded={openIds.has(item.id)}
                  aria-label={
                    openIds.has(item.id)
                      ? `Collapse ${item.label}`
                      : `Expand ${item.label}`
                  }
                  onClick={() => onToggle(item.id)}
                >
                  <MnavChevron show isOpen={openIds.has(item.id)} />
                </button>
              ) : null}
            </div>
            <div className="mnav-children">
              <div className="mnav-children__clip" inert={!openIds.has(item.id)}>
                <NavRowsList
                  items={item.children}
                  depth={depth + 1}
                  localeCode={localeCode}
                  surface={surface}
                  showIcons={showIcons}
                  iconBreakpoint={iconBreakpoint}
                  iconDefaults={iconDefaults}
                  showArrows={showArrows}
                  onClose={onClose}
                  openIds={openIds}
                  onToggle={onToggle}
                />
              </div>
            </div>
          </div>
        ) : (
          <a
            key={item.id}
            href={getItemHref(item, localeCode)}
            className={mnavRowClass(variant)}
            style={mnavDepthStyle(depth)}
            data-mnav-depth={depth}
            onClick={(e) => handleNavLinkClick(e, surface, onClose)}
          >
            <MnavItemRowContent
              icon={item.icon}
              label={item.label}
              showIcons={slotFor(item).show}
              iconOverride={slotFor(item).override}
              variant={variant}
            />
          </a>
        ),
      )}
    </>
  );
}

interface OverlayProps {
  type: MobileNavType;
  items: MenuItem[];
  actions: HeaderAction[];
  onActionClick?: (action: HeaderAction) => void;
  onClose: () => void;
  localeCode: string;
  surface?: HeaderRendererSurface;
  showIcons: boolean;
  iconBreakpoint?: NavIconBreakpoint;
  iconDefaults?: NavIconVisibility;
  showArrows: boolean;
}

function MobileNavActionsStrip({
  actions,
  localeCode,
  onActionClick,
}: {
  actions: HeaderAction[];
  localeCode: string;
  onActionClick?: (action: HeaderAction) => void;
}) {
  const visible = actions.some((a) => a.visible !== false);
  if (!visible) return null;
  return (
    <div className="mobile-nav-actions mnav-actions">
      <HeaderActions actions={actions} localeCode={localeCode} onActionClick={onActionClick} />
    </div>
  );
}

function MobileNavOverlay({
  type,
  items,
  actions,
  onActionClick,
  onClose,
  localeCode,
  surface = "site",
  showIcons,
  iconBreakpoint,
  iconDefaults,
  showArrows,
}: OverlayProps) {
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (surface === "preview") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [surface]);

  if (type === "fullscreen") {
    return (
      <div className="mnav-overlay mnav-overlay--fullscreen" role="dialog" aria-modal aria-label="Navigation">
        <button type="button" className="mnav-close mnav-close--fs" aria-label="Close menu" onClick={onClose}>
          <i className="fas fa-times" aria-hidden />
        </button>
        <MobileNavActionsStrip actions={actions} localeCode={localeCode} onActionClick={onActionClick} />
        <nav className="mnav-fs-grid">
          {items.map((item) => (
            <a
              key={item.id}
              href={getItemHref(item, localeCode)}
              className="mnav-fs-item"
              onClick={(e) => handleNavLinkClick(e, surface, onClose)}
            >
              <MnavIconSlot
                icon={item.icon}
                showIcons={
                  iconBreakpoint && iconDefaults
                    ? iconSlotDecision(item, iconBreakpoint, iconDefaults).show
                    : showIcons
                }
                override={
                  iconBreakpoint && iconDefaults
                    ? iconSlotDecision(item, iconBreakpoint, iconDefaults).override
                    : false
                }
                fallbackIcon="fa-circle"
              />
              <span className="mnav-fs-item__label">{item.label}</span>
            </a>
          ))}
        </nav>
      </div>
    );
  }

  if (type === "tabs") {
    const parents = items.filter((i) => i.children.length > 0);
    const tabs = parents.length > 0 ? parents : [{ id: "__all__", label: "Menu", children: items } as MenuItem];
    const current = tabs[Math.min(activeTab, tabs.length - 1)];

    return (
      <div className="mnav-overlay mnav-overlay--tabs" role="dialog" aria-modal aria-label="Navigation">
        <div className="mnav-backdrop" onClick={onClose} aria-hidden />
        <div className="mnav-panel">
          <div className="mnav-head">
            <button type="button" className="mnav-close" aria-label="Close menu" onClick={onClose}>
              <i className="fas fa-times" aria-hidden />
            </button>
          </div>
          <MobileNavActionsStrip actions={actions} localeCode={localeCode} onActionClick={onActionClick} />
          <div className="mnav-tabs-bar">
            {tabs.map((tab, idx) => (
              <button
                key={tab.id}
                type="button"
                className={`mnav-tab-btn${idx === activeTab ? " is-active" : ""}`}
                onClick={() => setActiveTab(idx)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <nav className="mnav-body">
            {current.children.map((item) => (
              <a
                key={item.id}
                href={getItemHref(item, localeCode)}
                className={mnavRowClass("row")}
                onClick={(e) => handleNavLinkClick(e, surface, onClose)}
              >
                <MnavItemRowContent
                  icon={item.icon}
                  label={item.label}
                  showIcons={
                    iconBreakpoint && iconDefaults
                      ? iconSlotDecision(item, iconBreakpoint, iconDefaults).show
                      : showIcons
                  }
                  iconOverride={
                    iconBreakpoint && iconDefaults
                      ? iconSlotDecision(item, iconBreakpoint, iconDefaults).override
                      : false
                  }
                />
              </a>
            ))}
          </nav>
        </div>
      </div>
    );
  }

  if (type === "search") {
    return (
      <div className="mnav-overlay mnav-overlay--search" role="dialog" aria-modal aria-label="Navigation">
        <div className="mnav-backdrop" onClick={onClose} aria-hidden />
        <div className="mnav-panel">
          <div className="mnav-head">
            <button type="button" className="mnav-close" aria-label="Close menu" onClick={onClose}>
              <i className="fas fa-times" aria-hidden />
            </button>
          </div>
          <MobileNavActionsStrip actions={actions} localeCode={localeCode} onActionClick={onActionClick} />
          <div className="mnav-search-bar">
            <span className="mnav-search-bar__icon" aria-hidden>
              <i className="fas fa-search" />
            </span>
            <input
              type="search"
              className="mnav-search-input"
              placeholder="Search…"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  requestOpenSearch();
                  onClose();
                }
              }}
            />
          </div>
          <nav className="mnav-body">
            <NavRows
              items={items}
              localeCode={localeCode}
              surface={surface}
              showIcons={showIcons}
              iconBreakpoint={iconBreakpoint}
              iconDefaults={iconDefaults}
              showArrows={showArrows}
              onClose={onClose}
            />
          </nav>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mnav-overlay mnav-overlay--${type}`}
      role="dialog"
      aria-modal
      aria-label="Navigation"
    >
      <div className="mnav-backdrop" onClick={onClose} aria-hidden />
      <div className="mnav-panel">
        <div className="mnav-head">
          <button type="button" className="mnav-close" aria-label="Close menu" onClick={onClose}>
            <i className="fas fa-times" aria-hidden />
          </button>
        </div>
        <MobileNavActionsStrip actions={actions} localeCode={localeCode} onActionClick={onActionClick} />
        <nav className="mnav-body">
          <NavRows
            items={items}
            localeCode={localeCode}
            surface={surface}
            showIcons={showIcons}
            iconBreakpoint={iconBreakpoint}
            iconDefaults={iconDefaults}
            showArrows={showArrows}
            onClose={onClose}
          />
        </nav>
      </div>
    </div>
  );
}

type PortalShellProps = {
  children: ReactNode;
  mobileNavStyle?: MobileNavStyle;
  mobileNavAnimation?: MobileNavAnimation;
  mobileNavDensity?: MobileNavDensity;
  surface?: HeaderRendererSurface;
  menuAppearance?: ResolvedMobileMenuAppearance;
  animState: MnavAnimState;
  showIcons: boolean;
  iconVisibility?: NavIconVisibility;
  showArrows: boolean;
};

function MobileNavPortalShell({
  children,
  mobileNavStyle = "minimal",
  mobileNavAnimation = "slide",
  mobileNavDensity = "comfortable",
  surface = "site",
  menuAppearance,
  animState,
  showIcons,
  iconVisibility,
  showArrows,
}: PortalShellProps) {
  const menuAttrs = menuAppearance ? menuAppearanceDataAttributes(menuAppearance) : {};
  const iconAttrs = iconVisibility ? navIconVisibilityDataAttributes(iconVisibility) : {};
  return (
    <div
      className="mnav-portal-root"
      data-mnav-state={animState}
      data-mobile-nav-style={mobileNavStyle}
      data-mobile-nav-animation={mobileNavAnimation}
      data-mobile-nav-density={mobileNavDensity}
      data-mobile-nav-show-icons={showIcons ? "true" : "false"}
      data-mobile-nav-show-arrows={showArrows ? "true" : "false"}
      data-header-surface={surface}
      style={menuAppearance ? menuAppearanceStyle(menuAppearance) : undefined}
      {...iconAttrs}
      {...menuAttrs}
    >
      {children}
    </div>
  );
}

export function MobileMenuPreview({
  mobileType,
  items = [],
  surface = "site",
  actions = [],
  onActionClick,
  onOpen,
  localeCode = "en",
  mobileNavStyle = "minimal",
  mobileNavAnimation = "slide",
  mobileNavDensity = "comfortable",
  menuAppearance,
  showIcons = true,
  iconVisibility,
  showArrows = true,
}: Props) {
  const iconBreakpoint = useNavIconBreakpoint();
  const iconDefaults: NavIconVisibility = iconVisibility ?? {
    mobile: showIcons,
    tablet: showIcons,
    desktop: true,
  };
  const mobileItems = items.filter(
    (item) => item.placement === "both" || item.placement === "mobile",
  );
  const [portalVisible, setPortalVisible] = useState(false);
  const [animState, setAnimState] = useState<MnavAnimState>("closed");
  const [mounted, setMounted] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  const isMenuOpen = animState === "open";
  const portalShowsIcons = anyItemShowsNavIcon(mobileItems, iconBreakpoint, iconDefaults);

  const openMenu = useCallback(() => {
    setPortalVisible(true);
    setAnimState("closed");
    onOpen?.();
  }, [onOpen]);

  const closeMenu = useCallback(() => {
    if (!portalVisible) return;
    setAnimState((prev) => (prev === "closing" ? prev : "closing"));
  }, [portalVisible]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!portalVisible || animState !== "closed") return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimState("open"));
    });
    return () => cancelAnimationFrame(id);
  }, [portalVisible, animState]);

  useEffect(() => {
    if (animState !== "closing") return;
    const ms = getMobileAnimDuration(mobileNavAnimation);
    closeTimerRef.current = setTimeout(() => {
      setPortalVisible(false);
      setAnimState("closed");
    }, ms);
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [animState, mobileNavAnimation]);

  useEffect(() => {
    const close = () => closeMenu();
    document.addEventListener("azura:close-mobile-menu", close);
    return () => document.removeEventListener("azura:close-mobile-menu", close);
  }, [closeMenu]);

  useEffect(() => {
    if (surface === "preview") return;
    if (pathnameRef.current === pathname) return;
    pathnameRef.current = pathname;
    closeMenu();
  }, [pathname, closeMenu, surface]);

  useEffect(() => {
    if (surface === "preview") return;
    const mq = window.matchMedia(NAV_MOBILE_MQ);
    const onChange = () => {
      if (!mq.matches) closeMenu();
    };
    mq.addEventListener("change", onChange);
    window.addEventListener("orientationchange", onChange, { passive: true });
    return () => {
      mq.removeEventListener("change", onChange);
      window.removeEventListener("orientationchange", onChange);
    };
  }, [closeMenu, surface]);

  useEffect(() => {
    if (!portalVisible) return;
    const root = document.documentElement;
    // Drop lock class as soon as close starts so page chrome isn't held blurred
    if (animState === "open") root.classList.add("mnav-open");
    else root.classList.remove("mnav-open");
    return () => root.classList.remove("mnav-open");
  }, [portalVisible, animState]);

  const toggle = () => {
    if (mobileType === "search" && surface !== "preview") {
      requestOpenSearch();
      return;
    }
    if (isMenuOpen) closeMenu();
    else if (!portalVisible) openMenu();
  };

  if (mobileType === "bottom") {
    const iconAttrs = iconVisibility ? navIconVisibilityDataAttributes(iconVisibility) : {};
    return (
      <nav
        className="mnav-bottom-bar"
        data-mobile-type="bottom"
        data-mobile-nav-show-icons={portalShowsIcons ? "true" : "false"}
        aria-label="Navigation"
        {...iconAttrs}
      >
        {mobileItems.slice(0, 5).map((item) => (
          <a
            key={item.id}
            href={getItemHref(item, localeCode)}
            className="mnav-bottom-item"
            onClick={surface === "preview" ? (e) => e.preventDefault() : undefined}
          >
            <MnavIconSlot
              icon={item.icon}
              showIcons={iconSlotDecision(item, iconBreakpoint, iconDefaults).show}
              override={iconSlotDecision(item, iconBreakpoint, iconDefaults).override}
              fallbackIcon="fa-circle"
            />
            <span className="mnav-bottom-item__label">{item.label}</span>
          </a>
        ))}
      </nav>
    );
  }

  const triggerIcon =
    mobileType === "search" ? "fa-search" :
    mobileType === "fullscreen" ? "fa-th" :
    "fa-bars";

  return (
    <>
      <button
        id="mobileTriggerBtn"
        type="button"
        className={`mobile-trigger mobile-trigger--${mobileType}`}
        aria-label={
          mobileType === "search" && surface !== "preview"
            ? "Open search"
            : isMenuOpen
              ? "Close menu"
              : "Open menu"
        }
        aria-expanded={isMenuOpen}
        aria-haspopup="dialog"
        data-mobile-type={mobileType}
        onPointerDown={
          mobileType === "search" && surface !== "preview"
            ? () => prefetchSearchModal()
            : undefined
        }
        onClick={toggle}
      >
        {/* Keep bars icon — panel owns the close control (avoids double X through glass) */}
        <i className={`fas ${triggerIcon}`} aria-hidden />
      </button>
      {portalVisible && mounted
        ? createPortal(
            <MobileNavPortalShell
              mobileNavStyle={mobileNavStyle}
              mobileNavAnimation={mobileNavAnimation}
              mobileNavDensity={mobileNavDensity}
              surface={surface}
              menuAppearance={menuAppearance}
              animState={animState}
              showIcons={portalShowsIcons}
              iconVisibility={iconVisibility}
              showArrows={showArrows}
            >
              <MobileNavOverlay
                type={mobileType}
                items={mobileItems}
                actions={actions}
                onActionClick={onActionClick}
                onClose={closeMenu}
                localeCode={localeCode}
                surface={surface}
                showIcons={portalShowsIcons}
                iconBreakpoint={iconBreakpoint}
                iconDefaults={iconDefaults}
                showArrows={showArrows}
              />
            </MobileNavPortalShell>,
            document.body
          )
        : null}
    </>
  );
}
