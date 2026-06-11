"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { getCmsPagePublicPath } from "@/features/cms/cms-page-path";
import { stripAnyLocalePrefix } from "@/i18n/url-helpers";
import { findInternalNavAnchor, getInternalLinkPath } from "@/lib/navigation/internal-link";
import { captureSharedElementHandoff } from "@/lib/navigation/shared-elements";
import { sessionDebugLog } from "@/lib/debug/session-log";

function normalizeNavPath(pathPart: string): string {
  let neutralPath = stripAnyLocalePrefix(pathPart);
  const pagesMatch = neutralPath.match(/^\/pages\/([^/]+)\/?$/);
  if (pagesMatch?.[1]) {
    neutralPath = getCmsPagePublicPath(pagesMatch[1]);
  }
  return neutralPath;
}

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

      const neutralPath = normalizeNavPath(pathPart);
      if (neutralPath === pathname || neutralPath === `${pathname}/`) return;

      captureSharedElementHandoff(anchor);
      sessionDebugLog(
        "navigation-view-transition.tsx:onClick",
        "internal nav intercepted",
        {
          from: pathname,
          to: neutralPath,
          hasSharedRoot: Boolean(anchor.closest("[data-shared-element-root]")),
          selectionType: window.getSelection()?.type,
        },
        "B",
      );
      event.preventDefault();
      router.push(neutralPath);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router, pathname]);

  return null;
}
