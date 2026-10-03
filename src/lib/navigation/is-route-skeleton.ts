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

function hasBuildShellAttr(element: ReactElement<RouteSkeletonElementProps>): boolean {
  return element.props[BUILD_SHELL_ATTR] === true || element.props[BUILD_SHELL_ATTR] === "true";
}

/**
 * True when the route slot is a compile-time ISR placeholder.
 * Only inspects the route root (and a single pass-through wrapper) — never deep CMS trees.
 */
export function isBuildShell(node: ReactNode): boolean {
  if (node == null || typeof node === "boolean") return false;

  if (Array.isArray(node)) {
    return node.some((child) => isBuildShell(child));
  }

  const element = toRouteSkeletonElement(node);
  if (!element) return false;

  if (hasBuildShellAttr(element)) return true;

  // One wrapper level (e.g. layout fragment around the shell div).
  const child = element.props.children;
  if (Array.isArray(child)) {
    return child.some((c) => {
      const el = toRouteSkeletonElement(c);
      return el ? hasBuildShellAttr(el) : false;
    });
  }
  const childEl = toRouteSkeletonElement(child);
  return childEl ? hasBuildShellAttr(childEl) : false;
}

/**
 * True when Next.js is rendering a route-level loading.tsx fallback,
 * or a compile-time build shell (treated as loading — never ready content).
 *
 * Root-attr only. Nested PageLoadingSkeleton inside Suspense islands must not
 * mark the whole marketing page as a skeleton (that swapped SSR HTML → #418).
 */
export function isRouteSkeleton(node: ReactNode): boolean {
  if (node == null || typeof node === "boolean") return false;

  if (isBuildShell(node)) return true;

  if (Array.isArray(node)) {
    return node.some((child) => isRouteSkeletonRoot(child));
  }

  return isRouteSkeletonRoot(node);
}

function isRouteSkeletonRoot(node: ReactNode): boolean {
  const element = toRouteSkeletonElement(node);
  if (!element) return false;

  if (element.props[ROUTE_SKELETON_ATTR]) return true;

  // Component that renders a skeleton root (PageLoadingSkeleton) — check one child level
  // when the component itself has no DOM props yet.
  const typeName =
    typeof element.type === "function"
      ? element.type.name
      : typeof element.type === "string"
        ? element.type
        : "";

  if (typeName === "PageLoadingSkeleton") return true;

  // Single pass-through wrapper around a marked skeleton root.
  const child = element.props.children;
  if (Array.isArray(child)) {
    return child.some((c) => {
      const el = toRouteSkeletonElement(c);
      return Boolean(el?.props[ROUTE_SKELETON_ATTR]);
    });
  }
  const childEl = toRouteSkeletonElement(child);
  return Boolean(childEl?.props[ROUTE_SKELETON_ATTR]);
}

export function firstRouteSkeleton(node: ReactNode): ReactNode | null {
  if (!isRouteSkeleton(node)) return null;
  /** Build shell is loading, but has no skeleton UI — caller should render PageLoadingSkeleton. */
  if (isBuildShell(node) && !hasExplicitSkeletonAttr(node)) return null;

  if (Array.isArray(node)) {
    for (const child of node) {
      const found = firstRouteSkeleton(child);
      if (found) return found;
    }
    return null;
  }

  const element = toRouteSkeletonElement(node);
  if (!element) return null;
  if (element.props[ROUTE_SKELETON_ATTR]) return node;

  const typeName =
    typeof element.type === "function"
      ? element.type.name
      : typeof element.type === "string"
        ? element.type
        : "";
  if (typeName === "PageLoadingSkeleton") return node;

  const child = element.props.children;
  if (Array.isArray(child)) {
    for (const c of child) {
      const found = firstRouteSkeleton(c);
      if (found) return found;
    }
    return node;
  }
  return firstRouteSkeleton(child) ?? node;
}

function hasExplicitSkeletonAttr(node: ReactNode): boolean {
  if (node == null || typeof node === "boolean") return false;
  if (Array.isArray(node)) return node.some(hasExplicitSkeletonAttr);
  const element = toRouteSkeletonElement(node);
  if (!element) return false;
  if (element.props[ROUTE_SKELETON_ATTR]) return true;
  const child = element.props.children;
  if (Array.isArray(child)) return child.some(hasExplicitSkeletonAttr);
  const childEl = toRouteSkeletonElement(child);
  return Boolean(childEl?.props[ROUTE_SKELETON_ATTR]);
}
