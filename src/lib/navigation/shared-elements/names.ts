import type { CSSProperties } from "react";

export const SHARED_ELEMENT_TYPES = [
  "product",
  "collection",
  "blog",
  "gallery",
  "content",
] as const;

export type SharedElementType = (typeof SHARED_ELEMENT_TYPES)[number];

export const SHARED_ELEMENT_KINDS = ["image", "title"] as const;

export type SharedElementKind = (typeof SHARED_ELEMENT_KINDS)[number];

/** Sanitize slug/id for valid CSS view-transition-name identifiers. */
export function sanitizeSharedElementId(id: string): string {
  const raw = typeof id === "string" ? id : id == null ? "" : String(id);
  const cleaned = raw
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.slice(0, 80) || "item";
}

/** Deterministic view-transition-name for card → detail morphing. */
export function sharedElementViewTransitionName(
  type: SharedElementType,
  id: string,
  kind: SharedElementKind,
): string {
  return `se-${type}-${kind}-${sanitizeSharedElementId(id)}`;
}

export function sharedElementRootAttrs(type: SharedElementType, id: string) {
  return {
    "data-shared-element-root": "",
    "data-shared-element-type": type,
    "data-shared-element-id": id,
  } as const;
}

export function sharedElementAttrs(
  type: SharedElementType,
  id: string,
  kind: SharedElementKind,
) {
  return {
    "data-shared-element": kind,
    "data-shared-element-type": type,
    "data-shared-element-id": id,
    style: {
      viewTransitionName: sharedElementViewTransitionName(type, id, kind),
    } as CSSProperties,
  };
}
