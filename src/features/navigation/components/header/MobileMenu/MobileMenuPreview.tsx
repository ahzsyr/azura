"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type {
  HeaderAction,
  MenuItem,
  MobileNavAnimation,
  MobileNavDensity,
  MobileNavStyle,
  MobileNavType,
} from "@/features/navigation/types";
import type { ResolvedMenuAppearance } from "@/features/navigation/header-menu-appearance";
import {
  menuAppearanceDataAttributes,
  menuAppearanceStyle,
} from "@/features/navigation/header-menu-appearance";
import { getItemHref } from "@/features/navigation/resolve-href";
import type { HeaderRendererSurface } from "../HeaderRenderer";
import { HeaderActions } from "../HeaderActions";

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
  menuAppearance?: ResolvedMenuAppearance;
}

function NavRows({
  items,
  localeCode,
  surface,
}: {
  items: MenuItem[];
  localeCode: string;
  surface?: HeaderRendererSurface;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <>
      {items.map((item) =>
        item.children.length > 0 ? (
          <div key={item.id} className="mnav-item-wrap">
            <button
              type="button"
              className={`mnav-row mnav-row--parent${openIds.has(item.id) ? " is-open" : ""}`}
              onClick={() => toggle(item.id)}
            >
              {item.icon ? <i className={`fas ${item.icon}`} aria-hidden /> : null}
              <span>{item.label}</span>
              <i
                className={`fas fa-chevron-${openIds.has(item.id) ? "up" : "down"} mnav-chevron`}
                aria-hidden
              />
            </button>
            {openIds.has(item.id) ? (
              <div className="mnav-children">
                {item.children.map((child) => (
                  <a
                    key={child.id}
                    href={getItemHref(child, localeCode)}
                    className="mnav-row mnav-row--child"
                    onClick={(e) => blockPreviewNav(e, surface)}
                  >
                    {child.icon ? <i className={`fas ${child.icon}`} aria-hidden /> : null}
                    <span>{child.label}</span>
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <a
            key={item.id}
            href={getItemHref(item, localeCode)}
            className="mnav-row"
            onClick={(e) => blockPreviewNav(e, surface)}
          >
            {item.icon ? <i className={`fas ${item.icon}`} aria-hidden /> : null}
            <span>{item.label}</span>
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
}

function blockPreviewNav(e: React.MouseEvent, surface?: HeaderRendererSurface) {
  if (surface === "preview") {
    e.preventDefault();
  }
}

function MobileNavActionsStrip({
  actions,
  onActionClick,
}: {
  actions: HeaderAction[];
  onActionClick?: (action: HeaderAction) => void;
}) {
  const visible = actions.some((a) => a.visible !== false);
  if (!visible) return null;
  return (
    <div className="mobile-nav-actions mnav-actions">
      <HeaderActions actions={actions} onActionClick={onActionClick} />
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
        <MobileNavActionsStrip actions={actions} onActionClick={onActionClick} />
        <nav className="mnav-fs-grid">
          {items.map((item) => (
            <a
              key={item.id}
              href={getItemHref(item, localeCode)}
              className="mnav-fs-item"
              onClick={(e) => blockPreviewNav(e, surface)}
            >
              {item.icon ? <i className={`fas ${item.icon}`} aria-hidden /> : null}
              <span>{item.label}</span>
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
          <MobileNavActionsStrip actions={actions} onActionClick={onActionClick} />
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
                className="mnav-row"
                onClick={(e) => blockPreviewNav(e, surface)}
              >
                {item.icon ? <i className={`fas ${item.icon}`} aria-hidden /> : null}
                <span>{item.label}</span>
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
          <MobileNavActionsStrip actions={actions} onActionClick={onActionClick} />
          <div className="mnav-search-bar">
            <i className="fas fa-search" aria-hidden />
            <input
              type="search"
              className="mnav-search-input"
              placeholder="Search…"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  document.dispatchEvent(new CustomEvent("azura:open-site-search", { bubbles: true }));
                  onClose();
                }
              }}
            />
          </div>
          <nav className="mnav-body">
            <NavRows items={items} localeCode={localeCode} surface={surface} />
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
        <MobileNavActionsStrip actions={actions} onActionClick={onActionClick} />
        <nav className="mnav-body">
          <NavRows items={items} localeCode={localeCode} surface={surface} />
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
  menuAppearance?: ResolvedMenuAppearance;
};

function MobileNavPortalShell({
  children,
  mobileNavStyle = "minimal",
  mobileNavAnimation = "slide",
  mobileNavDensity = "comfortable",
  surface = "site",
  menuAppearance,
}: PortalShellProps) {
  const menuAttrs = menuAppearance ? menuAppearanceDataAttributes(menuAppearance) : {};
  return (
    <div
      className="mnav-portal-root"
      data-mobile-nav-style={mobileNavStyle}
      data-mobile-nav-animation={mobileNavAnimation}
      data-mobile-nav-density={mobileNavDensity}
      data-header-surface={surface}
      style={menuAppearance ? menuAppearanceStyle(menuAppearance) : undefined}
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
}: Props) {
  // Items have already been resolved for the mobile surface by HeaderRenderer;
  // filter here is a safety net — only show items intended for mobile.
  const mobileItems = items.filter(
    (item) => item.placement === "both" || item.placement === "mobile",
  );
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const close = () => setIsOpen(false);
    document.addEventListener("azura:close-mobile-menu", close);
    return () => document.removeEventListener("azura:close-mobile-menu", close);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    root.classList.add("mnav-open");
    return () => root.classList.remove("mnav-open");
  }, [isOpen]);

  const toggle = () => {
    setIsOpen((open) => {
      const next = !open;
      if (next) onOpen?.();
      return next;
    });
  };
  const close = () => setIsOpen(false);

  if (mobileType === "bottom") {
    return (
      <nav className="mnav-bottom-bar" data-mobile-type="bottom" aria-label="Navigation">
        {mobileItems.slice(0, 5).map((item) => (
          <a
            key={item.id}
            href={getItemHref(item, localeCode)}
            className="mnav-bottom-item"
            onClick={surface === "preview" ? (e) => e.preventDefault() : undefined}
          >
            <i className={`fas ${item.icon ?? "fa-circle"}`} aria-hidden />
            <span>{item.label}</span>
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
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        data-mobile-type={mobileType}
        onClick={toggle}
      >
        <i className={`fas ${isOpen ? "fa-times" : triggerIcon}`} aria-hidden />
      </button>
      {isOpen && mounted
        ? createPortal(
            <MobileNavPortalShell
              mobileNavStyle={mobileNavStyle}
              mobileNavAnimation={mobileNavAnimation}
              mobileNavDensity={mobileNavDensity}
              surface={surface}
              menuAppearance={menuAppearance}
            >
              <MobileNavOverlay
                type={mobileType}
                items={mobileItems}
                actions={actions}
                onActionClick={onActionClick}
                onClose={close}
                localeCode={localeCode}
                surface={surface}
              />
            </MobileNavPortalShell>,
            document.body
          )
        : null}
    </>
  );
}
