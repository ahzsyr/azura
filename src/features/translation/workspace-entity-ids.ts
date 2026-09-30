import { sha256Hex } from "@/lib/sha256-hex";

/** Stable entity id for a header action button. */
export function makeHeaderActionEntityId(actionId: string): string {
  return sha256Hex(`HeaderAction\0${actionId}`).slice(0, 32);
}

/** Stable entity id for a mega menu tab on a parent menu item. */
export function makeMegaMenuTabEntityId(menuKey: string, itemId: string, tabId: string): string {
  return sha256Hex(`MegaMenuTab\0${menuKey}\0${itemId}\0${tabId}`).slice(0, 32);
}

/** Stable entity id for mega menu panel copy (use `${itemId}:left` / `:right` for mixed layouts). */
export function makeMegaMenuPanelEntityId(menuKey: string, itemId: string): string {
  return sha256Hex(`MegaMenuPanel\0${menuKey}\0${itemId}`).slice(0, 32);
}

/** Stable entity id for a v2 mega menu navigation rail item. */
export function makeMegaMenuNavItemEntityId(menuKey: string, itemId: string, navItemId: string): string {
  return sha256Hex(`MegaMenuNavItem\0${menuKey}\0${itemId}\0${navItemId}`).slice(0, 32);
}

/** Stable entity id for a v2 mega menu panel label / column heading. */
export function makeMegaMenuV2PanelEntityId(menuKey: string, itemId: string, panelId: string): string {
  return sha256Hex(`MegaMenuV2Panel\0${menuKey}\0${itemId}\0${panelId}`).slice(0, 32);
}

/** Stable entity id for a menu item (fits EntityTranslation.entityId VarChar(36)). */
export function makeMenuItemEntityId(menuKey: string, itemId: string): string {
  return sha256Hex(`MenuItem\0${menuKey}\0${itemId}`).slice(0, 32);
}

/** Stable entity id for a footer column. */
export function makeFooterColumnEntityId(columnId: string): string {
  return sha256Hex(`FooterColumn\0${columnId}`).slice(0, 32);
}

/** Stable entity id for a footer link. */
export function makeFooterLinkEntityId(columnId: string, linkId: string): string {
  return sha256Hex(`FooterLink\0${columnId}\0${linkId}`).slice(0, 32);
}

/** Stable entity id for footer copyright block. */
export function makeFooterEntityId(): string {
  return sha256Hex("Footer\0default").slice(0, 32);
}

/** Form field translations keyed by template + field id. */
export function makeFormFieldEntityId(templateId: string, fieldId: string): string {
  const raw = `${templateId}:${fieldId}`;
  if (raw.length <= 36) return raw;
  return sha256Hex(`FormField\0${templateId}\0${fieldId}`).slice(0, 32);
}

/** Form step translations keyed by template + step id. */
export function makeFormStepEntityId(templateId: string, stepId: string): string {
  const raw = `${templateId}:${stepId}`;
  if (raw.length <= 36) return raw;
  return sha256Hex(`FormStep\0${templateId}\0${stepId}`).slice(0, 32);
}
