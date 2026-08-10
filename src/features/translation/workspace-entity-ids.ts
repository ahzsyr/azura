import { createHash } from "node:crypto";

/** Stable entity id for a header action button. */
export function makeHeaderActionEntityId(actionId: string): string {
  return createHash("sha256")
    .update(`HeaderAction\0${actionId}`)
    .digest("hex")
    .slice(0, 32);
}

/** Stable entity id for a mega menu tab on a parent menu item. */
export function makeMegaMenuTabEntityId(menuKey: string, itemId: string, tabId: string): string {
  return createHash("sha256")
    .update(`MegaMenuTab\0${menuKey}\0${itemId}\0${tabId}`)
    .digest("hex")
    .slice(0, 32);
}

/** Stable entity id for mega menu panel copy (use `${itemId}:left` / `:right` for mixed layouts). */
export function makeMegaMenuPanelEntityId(menuKey: string, itemId: string): string {
  return createHash("sha256")
    .update(`MegaMenuPanel\0${menuKey}\0${itemId}`)
    .digest("hex")
    .slice(0, 32);
}

/** Stable entity id for a menu item (fits EntityTranslation.entityId VarChar(36)). */
export function makeMenuItemEntityId(menuKey: string, itemId: string): string {
  return createHash("sha256")
    .update(`MenuItem\0${menuKey}\0${itemId}`)
    .digest("hex")
    .slice(0, 32);
}

/** Stable entity id for a footer column. */
export function makeFooterColumnEntityId(columnId: string): string {
  return createHash("sha256")
    .update(`FooterColumn\0${columnId}`)
    .digest("hex")
    .slice(0, 32);
}

/** Stable entity id for a footer link. */
export function makeFooterLinkEntityId(columnId: string, linkId: string): string {
  return createHash("sha256")
    .update(`FooterLink\0${columnId}\0${linkId}`)
    .digest("hex")
    .slice(0, 32);
}

/** Stable entity id for footer copyright block. */
export function makeFooterEntityId(): string {
  return createHash("sha256").update("Footer\0default").digest("hex").slice(0, 32);
}

/** Form field translations keyed by template + field id. */
export function makeFormFieldEntityId(templateId: string, fieldId: string): string {
  const raw = `${templateId}:${fieldId}`;
  if (raw.length <= 36) return raw;
  return createHash("sha256")
    .update(`FormField\0${templateId}\0${fieldId}`)
    .digest("hex")
    .slice(0, 32);
}

/** Form step translations keyed by template + step id. */
export function makeFormStepEntityId(templateId: string, stepId: string): string {
  const raw = `${templateId}:${stepId}`;
  if (raw.length <= 36) return raw;
  return createHash("sha256")
    .update(`FormStep\0${templateId}\0${stepId}`)
    .digest("hex")
    .slice(0, 32);
}
