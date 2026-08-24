"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  findInternalNavAnchor,
  getInternalLinkPath,
  isSameInternalNavTarget,
  normalizeInternalNavHref,
} from "@/lib/navigation/internal-link";
import { captureSharedElementHandoff } from "@/lib/navigation/shared-elements";
import { safeAppRouterNavigate } from "@/lib/navigation/safe-app-router";

/**
 * Intercepts same-origin link clicks for client-side navigation.
 * View transitions run when MarketingPageTransition commits new content.
 */
export function NavigationViewTransition() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (document.documentElement.dataset.pageTransitionEnabled === "false") return;

      const anchor = findInternalNavAnchor(event);
      if (!anchor) return;

      const pathPart = getInternalLinkPath(anchor);
      if (!pathPart) return;

      if (
        isSameInternalNavTarget(
          pathPart,
          pathname,
          window.location.search,
          window.location.hash,
          window.location.origin,
        )
      ) {
        return;
      }

      const neutralHref = normalizeInternalNavHref(pathPart, window.location.origin);

      captureSharedElementHandoff(anchor);
      event.preventDefault();
      safeAppRouterNavigate(router, neutralHref);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router, pathname]);

  return null;
}
