import { isValidElement, type ReactElement, type ReactNode } from "react";

export const ROUTE_SKELETON_ATTR = "data-route-skeleton";

/** True when Next.js is rendering a route-level loading.tsx fallback. */
export function isRouteSkeleton(node: ReactNode): boolean {
  if (node == null || typeof node === "boolean") return false;

  if (Array.isArray(node)) {
    return node.some((child) => isRouteSkeleton(child));
  }

  if (!isValidElement(node)) return false;

  const element = node as ReactElement<{ children?: ReactNode; [ROUTE_SKELETON_ATTR]?: boolean }>;
  if (element.props[ROUTE_SKELETON_ATTR]) return true;

  const typeName =
    typeof element.type === "function"
      ? element.type.name
      : typeof element.type === "string"
        ? element.type
        : "";

  if (typeName === "PageLoadingSkeleton") return true;

  return isRouteSkeleton(element.props.children);
}

export function firstRouteSkeleton(node: ReactNode): ReactNode | null {
  if (!isRouteSkeleton(node)) return null;
  if (isValidElement(node) && node.props[ROUTE_SKELETON_ATTR]) return node;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = firstRouteSkeleton(child);
      if (found) return found;
    }
    return null;
  }
  if (isValidElement(node)) {
    return firstRouteSkeleton(node.props.children) ?? node;
  }
  return null;
}
