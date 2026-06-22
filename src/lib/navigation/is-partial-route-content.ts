import { isValidElement, type ReactElement, type ReactNode } from "react";
import { isRouteSkeleton } from "@/lib/navigation/is-route-skeleton";

export const ROUTE_PARTIAL_FALLBACK_ATTR = "data-route-partial-fallback";

const LOADING_TEXT = /^loading[\s….]*/i;

function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (!isValidElement(node)) return "";
  const props = node.props as { children?: ReactNode };
  return extractText(props.children ?? null);
}

function isPartialFallbackElement(node: ReactNode): boolean {
  if (!isValidElement(node)) return false;

  const element = node as ReactElement<Record<string, unknown>>;
  if (element.props[ROUTE_PARTIAL_FALLBACK_ATTR]) return true;

  const typeName =
    typeof element.type === "function"
      ? element.type.name
      : typeof element.type === "string"
        ? element.type
        : "";

  if (typeName === "RouteSuspenseFallback") return true;

  if (element.type === "p") {
    const text = extractText(element.props.children as ReactNode).trim();
    if (LOADING_TEXT.test(text)) return true;
  }

  return false;
}

/** True when the tree still contains a Suspense fallback or loading placeholder. */
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
