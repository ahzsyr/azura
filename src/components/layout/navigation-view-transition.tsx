"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { getCmsPagePublicPath } from "@/features/cms/cms-page-path";
import { stripAnyLocalePrefix } from "@/i18n/url-helpers";
import { findInternalNavAnchor, getInternalLinkPath } from "@/lib/navigation/internal-link";
import { runWithViewTransition } from "@/lib/theme/effects/transition-engine";

/**
 * Intercepts same-origin link clicks and navigates through the View Transitions API
 * when supported, for smoother page-to-page visual handoff.
 */
export function NavigationViewTransition() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (typeof document.startViewTransition !== "function") return;

      const anchor = findInternalNavAnchor(event);
      if (!anchor) return;

      const pathPart = getInternalLinkPath(anchor);
      if (!pathPart) return;

      let neutralPath = stripAnyLocalePrefix(pathPart);
      const pagesMatch = neutralPath.match(/^\/pages\/([^/]+)\/?$/);
      if (pagesMatch?.[1]) {
        neutralPath = getCmsPagePublicPath(pagesMatch[1]);
      }
      if (neutralPath === pathname || neutralPath === `${pathname}/`) return;

      event.preventDefault();

      runWithViewTransition(() => {
        router.push(neutralPath);
      });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router, pathname]);

  return null;
}
