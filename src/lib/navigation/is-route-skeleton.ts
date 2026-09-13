import { isValidElement, type ReactElement, type ReactNode } from "react";

export const ROUTE_SKELETON_ATTR = "data-route-skeleton";
export const BUILD_SHELL_ATTR = "data-build-shell";

type RouteSkeletonElementProps = {
  children?: ReactNode;
  [ROUTE_SKELETON_ATTR]?: boolean;
  [BUILD_SHELL_ATTR]?: boolean | "true";
};

function toRouteSkeletonElement(
  node: ReactNode,
): ReactElement<RouteSkeletonElementProps> | null {
  if (!isValidElement(node)) return null;
  return node as ReactElement<RouteSkeletonElementProps>;
}

/** True when the route is a compile-time ISR placeholder (empty home shell). */
export function isBuildShell(node: ReactNode): boolean {
  if (node == null || typeof node === "boolean") return false;

  if (Array.isArray(node)) {
    return node.some((child) => isBuildShell(child));
  }

  const element = toRouteSkeletonElement(node);
  if (!element) return false;

  if (element.props[BUILD_SHELL_ATTR] === true || element.props[BUILD_SHELL_ATTR] === "true") {
    return true;
  }

  return isBuildShell(element.props.children);
}

/**
 * True when Next.js is rendering a route-level loading.tsx fallback,
 * or a compile-time build shell (treated as loading — never ready content).
 */
export function isRouteSkeleton(node: ReactNode): boolean {
  if (node == null || typeof node === "boolean") return false;

  if (isBuildShell(node)) return true;

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
  /** Build shell is loading, but has no skeleton UI — caller should render PageLoadingSkeleton. */
  if (isBuildShell(node) && !hasExplicitSkeletonAttr(node)) return null;
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

function hasExplicitSkeletonAttr(node: ReactNode): boolean {
  if (node == null || typeof node === "boolean") return false;
  if (Array.isArray(node)) return node.some(hasExplicitSkeletonAttr);
  const element = toRouteSkeletonElement(node);
  if (!element) return false;
  if (element.props[ROUTE_SKELETON_ATTR]) return true;
  return hasExplicitSkeletonAttr(element.props.children);
}
