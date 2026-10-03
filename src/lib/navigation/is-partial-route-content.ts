import { isValidElement, type ReactElement, type ReactNode } from "react";
import { isRouteSkeleton } from "@/lib/navigation/is-route-skeleton";

export const ROUTE_PARTIAL_FALLBACK_ATTR = "data-route-partial-fallback";

function isPartialFallbackElement(node: ReactNode): boolean {
  if (!isValidElement(node)) return false;

  const element = node as ReactElement<Record<string, unknown>>;
  // Attr-only — never match on "Loading…" text or minified component names.
  return Boolean(element.props[ROUTE_PARTIAL_FALLBACK_ATTR]);
}

/**
 * True when the tree still contains a marked Suspense fallback.
 * Used only for client-navigation stale-page hold — not first-load commit.
 */
export function containsPartialRouteContent(node: ReactNode): boolean {
  if (node == null || typeof node === "boolean") return false;
  if (isRouteSkeleton(node)) return false;

  if (Array.isArray(node)) {
    return node.some((child) => containsPartialRouteContent(child));
  }

  if (isPartialFallbackElement(node)) return true;

  if (!isValidElement(node)) return false;
  const props = node.props as { children?: ReactNode };
  if (props.children == null) return false;
  return containsPartialRouteContent(props.children);
}

/** True when Next.js is rendering a route-level loading.tsx fallback. */
export function isPartialRouteContent(node: ReactNode): boolean {
  return containsPartialRouteContent(node);
}
