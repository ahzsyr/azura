import { isValidElement, type ReactElement, type ReactNode } from "react";

export const ROUTE_SKELETON_ATTR = "data-route-skeleton";

type RouteSkeletonElementProps = {
  children?: ReactNode;
  [ROUTE_SKELETON_ATTR]?: boolean;
};

function toRouteSkeletonElement(
  node: ReactNode,
): ReactElement<RouteSkeletonElementProps> | null {
  if (!isValidElement(node)) return null;
  return node as ReactElement<RouteSkeletonElementProps>;
}

/** True when Next.js is rendering a route-level loading.tsx fallback. */
export function isRouteSkeleton(node: ReactNode): boolean {
  if (node == null || typeof node === "boolean") return false;

  if (Array.isArray(node)) {
    return node.some((child) => isRouteSkeleton(child));
  }

  const element = toRouteSkeletonElement(node);
  if (!element) return false;

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
  const element = toRouteSkeletonElement(node);
  if (element?.props[ROUTE_SKELETON_ATTR]) return node;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = firstRouteSkeleton(child);
      if (found) return found;
    }
    return null;
  }
  if (element) {
    return firstRouteSkeleton(element.props.children) ?? node;
  }
  return null;
}
