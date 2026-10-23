"use client";

/**
 * The mobile menu host and its header trigger talk only through these document
 * events and a shared shown-state store, the same way the search button reaches
 * the search panel. Any code can open, close, or toggle the menu without a ref.
 *
 * Events carry an optional `hostId`. Without one, open and toggle reach the
 * live site menu only (never a builder preview); close reaches every host.
 */
export const MOBILE_MENU_OPEN_EVENT = "azura:open-mobile-menu";
export const MOBILE_MENU_TOGGLE_EVENT = "azura:toggle-mobile-menu";
export const MOBILE_MENU_CLOSE_EVENT = "azura:close-mobile-menu";

export type MobileMenuEventDetail = { hostId?: string };

const shownByHost = new Map<string, boolean>();
const listeners = new Set<() => void>();

export function setMobileMenuShown(hostId: string, shown: boolean): void {
  if ((shownByHost.get(hostId) ?? false) === shown) return;
  shownByHost.set(hostId, shown);
  listeners.forEach((listener) => listener());
}

export function clearMobileMenuHost(hostId: string): void {
  if (!shownByHost.delete(hostId)) return;
  listeners.forEach((listener) => listener());
}

export function isMobileMenuShown(hostId: string): boolean {
  return shownByHost.get(hostId) ?? false;
}

export function subscribeMobileMenu(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function dispatch(type: string, hostId?: string): void {
  if (typeof document === "undefined") return;
  document.dispatchEvent(
    new CustomEvent<MobileMenuEventDetail>(type, { bubbles: true, detail: { hostId } }),
  );
}

export function requestOpenMobileMenu(hostId?: string): void {
  dispatch(MOBILE_MENU_OPEN_EVENT, hostId);
}

export function requestToggleMobileMenu(hostId?: string): void {
  dispatch(MOBILE_MENU_TOGGLE_EVENT, hostId);
}

export function requestCloseMobileMenu(hostId?: string): void {
  dispatch(MOBILE_MENU_CLOSE_EVENT, hostId);
}

/** Whether an event addressed to `detail.hostId` applies to this host. */
export function mobileMenuEventTargetsHost(
  event: Event,
  hostId: string,
  isSiteHost: boolean,
  kind: "open" | "close",
): boolean {
  const target = (event as CustomEvent<MobileMenuEventDetail | null>).detail?.hostId;
  if (target) return target === hostId;
  return kind === "close" || isSiteHost;
}
