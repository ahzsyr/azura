"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as DialogPrimitive from "@radix-ui/react-dialog";
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
  prefersReducedSiteMotion,
} from "@/features/navigation/header-menu-appearance";
import { NAV_MOBILE_MQ, NAV_MOBILE_NARROW_MAX_PX } from "@/features/navigation/nav-breakpoints";
import { useMounted } from "@/hooks/use-mounted";
import { getItemHref } from "@/features/navigation/resolve-href";
import { NavLink } from "../NavLink";
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

type MnavAnimState = "closed" | "opening" | "open" | "closing";

const SWIPE_DISMISS_RATIO = 0.3;
const SWIPE_DISMISS_VELOCITY = 0.6;

function mnavMotionTarget(root: HTMLElement | null): HTMLElement | null {
  if (!root) return null;
  return root.querySelector<HTMLElement>(".mnav-panel, .mnav-overlay--fullscreen");
}

function isRtlDocument(): boolean {
  const root = document.documentElement;
  return root.dir === "rtl" || root.classList.contains("rtl");
}

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
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
              <NavLink
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
              </NavLink>
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
          <NavLink
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
          </NavLink>
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
  /** Called after focus is returned when the dialog closes; use to restore focus to the trigger. */
  onCloseAutoFocus?: (e: Event) => void;
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

/** Shared props forwarded to every DialogPrimitive.Content inside the overlay. */
function overlayDialogProps(
  type: MobileNavType,
  onCloseAutoFocus: OverlayProps["onCloseAutoFocus"],
): Partial<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>> {
  return {
    // Keep the overlay in the DOM during the CSS close-animation (portalVisible
    // controls actual unmounting, not Radix).
    forceMount: true,
    "aria-label": "Navigation",
    // Restore focus to #mobileTriggerBtn instead of Radix's default behaviour.
    onCloseAutoFocus: (e: Event) => {
      e.preventDefault();
      (document.getElementById("mobileTriggerBtn") as HTMLElement | null)?.focus();
      onCloseAutoFocus?.(e);
    },
    // The backdrop / fullscreen overlay already cover the viewport, so there is
    // nothing outside to interact with.  Prevent Radix from dismissing on any
    // pointer-down that Radix would consider "outside" the Content boundary.
    onInteractOutside: (e: Event) => e.preventDefault(),
  };
}

export function MobileNavOverlay({
  type,
  items,
  actions,
  onActionClick,
  onClose,
  onCloseAutoFocus,
  localeCode,
  surface = "site",
  showIcons,
  iconBreakpoint,
  iconDefaults,
  showArrows,
}: OverlayProps) {
  const [activeTab, setActiveTab] = useState(0);

  // Body-scroll lock — keep this effect; Escape + focus-trap are handled by
  // DialogPrimitive.Root / DialogPrimitive.Content.
  useEffect(() => {
    if (surface === "preview") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [surface]);

  const dialogProps = overlayDialogProps(type, onCloseAutoFocus);

  if (type === "fullscreen") {
    return (
      <DialogPrimitive.Content
        {...dialogProps}
        className="mnav-overlay mnav-overlay--fullscreen"
      >
        <button type="button" className="mnav-close mnav-close--fs" aria-label="Close menu" onClick={onClose}>
          <i className="fas fa-times" aria-hidden />
        </button>
        <MobileNavActionsStrip actions={actions} localeCode={localeCode} onActionClick={onActionClick} />
        <nav className="mnav-fs-grid">
          {items.map((item) => (
            <NavLink
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
            </NavLink>
          ))}
        </nav>
      </DialogPrimitive.Content>
    );
  }

  if (type === "tabs") {
    const parents = items.filter((i) => i.children.length > 0);
    const tabs = parents.length > 0 ? parents : [{ id: "__all__", label: "Menu", children: items } as MenuItem];
    const activeTabId = tabs[Math.min(activeTab, tabs.length - 1)].id;

    return (
      <DialogPrimitive.Content
        {...dialogProps}
        className="mnav-overlay mnav-overlay--tabs"
      >
        <div className="mnav-backdrop" onClick={onClose} aria-hidden />
        <div className="mnav-panel">
          <div className="mnav-head">
            <button type="button" className="mnav-close" aria-label="Close menu" onClick={onClose}>
              <i className="fas fa-times" aria-hidden />
            </button>
          </div>
          <MobileNavActionsStrip actions={actions} localeCode={localeCode} onActionClick={onActionClick} />
          {/* Radix Tabs provides roving-tabindex keyboard navigation; keep
              mnav-tab-* CSS classes for visual styling. */}
          <TabsPrimitive.Root
            value={activeTabId}
            onValueChange={(val) => {
              const idx = tabs.findIndex((t) => t.id === val);
              if (idx >= 0) setActiveTab(idx);
            }}
          >
            <TabsPrimitive.List className="mnav-tabs-bar" aria-label="Navigation sections">
              {tabs.map((tab) => (
                <TabsPrimitive.Trigger
                  key={tab.id}
                  value={tab.id}
                  className={`mnav-tab-btn${tab.id === activeTabId ? " is-active" : ""}`}
                >
                  {tab.label}
                </TabsPrimitive.Trigger>
              ))}
            </TabsPrimitive.List>
            {tabs.map((tab) => (
              <TabsPrimitive.Content key={tab.id} value={tab.id} asChild>
                <nav className="mnav-body">
                  {tab.children.map((item) => (
                    <NavLink
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
                    </NavLink>
                  ))}
                </nav>
              </TabsPrimitive.Content>
            ))}
          </TabsPrimitive.Root>
        </div>
      </DialogPrimitive.Content>
    );
  }

  if (type === "search") {
    return (
      <DialogPrimitive.Content
        {...dialogProps}
        className="mnav-overlay mnav-overlay--search"
      >
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
            {/* Visually-hidden label + aria-label give every AT an accessible name. */}
            <label className="sr-only" htmlFor="mnav-search-input">Search</label>
            <input
              id="mnav-search-input"
              type="search"
              className="mnav-search-input"
              aria-label="Search"
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
      </DialogPrimitive.Content>
    );
  }

  return (
    <DialogPrimitive.Content
      {...dialogProps}
      className={`mnav-overlay mnav-overlay--${type}`}
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
    </DialogPrimitive.Content>
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
  settled: boolean;
  showIcons: boolean;
  iconVisibility?: NavIconVisibility;
  showArrows: boolean;
  portalRef: RefObject<HTMLDivElement | null>;
};

function MobileNavPortalShell({
  children,
  mobileNavStyle = "minimal",
  mobileNavAnimation = "slide",
  mobileNavDensity = "comfortable",
  surface = "site",
  menuAppearance,
  animState,
  settled,
  showIcons,
  iconVisibility,
  showArrows,
  portalRef,
}: PortalShellProps) {
  const menuAttrs = menuAppearance ? menuAppearanceDataAttributes(menuAppearance) : {};
  const iconAttrs = iconVisibility ? navIconVisibilityDataAttributes(iconVisibility) : {};
  return (
    <div
      ref={portalRef}
      className="mnav-portal-root"
      data-mnav-state={animState}
      data-mnav-settled={settled ? "true" : "false"}
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
  const [settled, setSettled] = useState(false);
  const mounted = useMounted();
  const portalRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  const menuShown = animState === "open" || animState === "opening";
  const portalShowsIcons = anyItemShowsNavIcon(mobileItems, iconBreakpoint, iconDefaults);

  const finishClose = useCallback(() => {
    setPortalVisible(false);
    setAnimState("closed");
    setSettled(false);
  }, []);

  const openMenu = useCallback(() => {
    const reduced = prefersReducedSiteMotion();
    setSettled(false);
    setPortalVisible(true);
    setAnimState(reduced ? "open" : "opening");
    onOpen?.();
  }, [onOpen]);

  const closeMenu = useCallback(() => {
    if (!portalVisible) return;
    setSettled(false);
    if (prefersReducedSiteMotion()) {
      finishClose();
      return;
    }
    setAnimState((prev) => (prev === "closing" || prev === "closed" ? prev : "closing"));
  }, [portalVisible, finishClose]);

  const cancelClose = useCallback(() => {
    if (prefersReducedSiteMotion()) {
      setAnimState("open");
      setSettled(false);
      return;
    }
    setSettled(false);
    setAnimState("opening");
  }, []);

  useEffect(() => {
    if (!portalVisible || animState !== "opening") return;
    const panel = mnavMotionTarget(portalRef.current);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setAnimState("open");
      if (!prefersReducedSiteMotion()) setSettled(true);
    };
    const onEnd = (event: TransitionEvent) => {
      if (event.target !== panel) return;
      if (event.propertyName !== "transform" && event.propertyName !== "opacity") return;
      finish();
    };
    panel?.addEventListener("transitionend", onEnd);
    const ms = getMobileAnimDuration(mobileNavAnimation, "enter");
    const fallback = window.setTimeout(finish, ms + 48);
    return () => {
      panel?.removeEventListener("transitionend", onEnd);
      window.clearTimeout(fallback);
    };
  }, [portalVisible, animState, mobileNavAnimation]);

  useLayoutEffect(() => {
    if (animState !== "closing") return;
    const root = portalRef.current;
    const panel = root?.querySelector<HTMLElement>(".mnav-panel");
    if (!root || !panel?.style.transform) return;
    root.removeAttribute("data-mnav-dragging");
    const current = panel.style.transform;
    panel.style.transition = "none";
    panel.style.transform = current;
    panel.getBoundingClientRect();
    panel.style.transition = "";
    panel.style.transform = "";
  }, [animState]);

  useEffect(() => {
    if (animState !== "closing") return;
    const panel = mnavMotionTarget(portalRef.current);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      finishClose();
    };
    const onEnd = (event: TransitionEvent) => {
      if (event.target !== panel) return;
      if (event.propertyName !== "transform" && event.propertyName !== "opacity") return;
      finish();
    };
    panel?.addEventListener("transitionend", onEnd);
    const ms = getMobileAnimDuration(mobileNavAnimation, "exit");
    const fallback = window.setTimeout(finish, Math.max(ms, 0) + 48);
    return () => {
      panel?.removeEventListener("transitionend", onEnd);
      window.clearTimeout(fallback);
    };
  }, [animState, mobileNavAnimation, finishClose]);

  useEffect(() => {
    if (animState !== "closing") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      cancelClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [animState, cancelClose]);

  useEffect(() => {
    if (animState !== "open") return;
    if (mobileNavAnimation !== "slide" && mobileNavAnimation !== "spring") return;
    const root = portalRef.current;
    const panel = root?.querySelector<HTMLElement>(".mnav-panel");
    if (!root || !panel) return;

    let tracking = false;
    let axis: "undecided" | "h" | "v" = "undecided";
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;
    let dragged = false;

    const dismissTravel = (dx: number, rtl: boolean) => Math.max(0, rtl ? -dx : dx);

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const target = event.target as Element | null;
      if (target?.closest("input, textarea, select, button")) return;
      tracking = true;
      dragged = false;
      axis = "undecided";
      startX = lastX = event.clientX;
      startY = event.clientY;
      lastT = event.timeStamp;
      velocity = 0;
    };

    const onMove = (event: PointerEvent) => {
      if (!tracking) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (axis === "undecided") {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axis = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        if (axis === "v") {
          tracking = false;
          return;
        }
        if (prefersReducedSiteMotion()) {
          tracking = false;
          closeMenu();
          return;
        }
        dragged = true;
        panel.setPointerCapture(event.pointerId);
        root.setAttribute("data-mnav-dragging", "true");
        setSettled(false);
      }
      if (axis !== "h") return;
      const dt = event.timeStamp - lastT;
      if (dt > 0) velocity = (event.clientX - lastX) / dt;
      lastX = event.clientX;
      lastT = event.timeStamp;
      const rtl = isRtlDocument();
      const travel = dismissTravel(dx, rtl);
      const signed = rtl ? -travel : travel;
      panel.style.transform = `translate3d(${signed}px, 0, 0)`;
    };

    const onUp = (event: PointerEvent) => {
      if (!tracking && !dragged) return;
      const wasHorizontal = axis === "h";
      tracking = false;
      axis = "undecided";
      if (!wasHorizontal) return;
      root.removeAttribute("data-mnav-dragging");
      const rtl = isRtlDocument();
      const travel = dismissTravel(event.clientX - startX, rtl);
      const width = panel.getBoundingClientRect().width || 1;
      const velDismiss = rtl ? -velocity : velocity;
      if (travel / width > SWIPE_DISMISS_RATIO || velDismiss > SWIPE_DISMISS_VELOCITY) {
        closeMenu();
        return;
      }
      panel.style.transition = "transform var(--mnav-duration-enter, 220ms) cubic-bezier(0.22, 1, 0.36, 1)";
      panel.style.transform = "translate3d(0, 0, 0)";
      const clearInline = (endEvent: TransitionEvent) => {
        if (endEvent.target !== panel || endEvent.propertyName !== "transform") return;
        panel.style.transition = "";
        panel.style.transform = "";
        if (!prefersReducedSiteMotion()) setSettled(true);
        panel.removeEventListener("transitionend", clearInline);
      };
      panel.addEventListener("transitionend", clearInline);
    };

    const onClickCapture = (event: MouseEvent) => {
      if (!dragged) return;
      dragged = false;
      event.preventDefault();
      event.stopPropagation();
    };

    panel.addEventListener("pointerdown", onDown);
    panel.addEventListener("pointermove", onMove);
    panel.addEventListener("pointerup", onUp);
    panel.addEventListener("pointercancel", onUp);
    panel.addEventListener("click", onClickCapture, true);
    return () => {
      panel.removeEventListener("pointerdown", onDown);
      panel.removeEventListener("pointermove", onMove);
      panel.removeEventListener("pointerup", onUp);
      panel.removeEventListener("pointercancel", onUp);
      panel.removeEventListener("click", onClickCapture, true);
      if (root.getAttribute("data-mnav-state") === "closing") return;
      root.removeAttribute("data-mnav-dragging");
      panel.style.transition = "";
      panel.style.transform = "";
    };
  }, [animState, mobileNavAnimation, closeMenu]);

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
    if (animState === "open" || animState === "opening") root.classList.add("mnav-open");
    else root.classList.remove("mnav-open");
    return () => root.classList.remove("mnav-open");
  }, [portalVisible, animState]);

  const toggle = () => {
    if (mobileType === "search" && surface !== "preview") {
      requestOpenSearch();
      return;
    }
    if (animState === "closing") cancelClose();
    else if (menuShown) closeMenu();
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
          <NavLink
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
          </NavLink>
        ))}
      </nav>
    );
  }

  const triggerIcon =
    mobileType === "search" ? "fa-search" :
    mobileType === "fullscreen" ? "fa-th" :
    "fa-bars";

  // DialogPrimitive.Root provides the context consumed by DialogPrimitive.Content
  // inside MobileNavOverlay (React context flows through createPortal).
  // open=true only during the "open" animation state; this deactivates the focus
  // trap early (on close-start) and fires onCloseAutoFocus to restore focus to the
  // trigger button while the CSS close-animation still plays.
  return (
    <DialogPrimitive.Root
      open={menuShown}
      onOpenChange={(open) => {
        if (!open) closeMenu();
      }}
    >
      <button
        id="mobileTriggerBtn"
        type="button"
        className={`mobile-trigger mobile-trigger--${mobileType}`}
        aria-label={
          mobileType === "search" && surface !== "preview"
            ? "Open search"
            : menuShown
              ? "Close menu"
              : "Open menu"
        }
        aria-expanded={menuShown}
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
              settled={settled}
              showIcons={portalShowsIcons}
              portalRef={portalRef}
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
    </DialogPrimitive.Root>
  );
}
