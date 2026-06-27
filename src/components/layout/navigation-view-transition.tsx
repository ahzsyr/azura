"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { getCmsPagePublicPath } from "@/features/cms/cms-page-path";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { augmentLocalesFromPathname, stripAnyLocalePrefix } from "@/i18n/url-helpers";
import { findInternalNavAnchor, getInternalLinkPath } from "@/lib/navigation/internal-link";
import { captureSharedElementHandoff } from "@/lib/navigation/shared-elements";
import { safeAppRouterNavigate } from "@/lib/navigation/safe-app-router";

function normalizeNavPath(pathPart: string): string {
  let neutralPath = stripAnyLocalePrefix(pathPart);
  const pagesMatch = neutralPath.match(/^\/pages\/([^/]+)\/?$/);
  if (pagesMatch?.[1]) {
    neutralPath = getCmsPagePublicPath(pagesMatch[1]);
  }
  return neutralPath;
}

function getFallbackKnownPrefixes(): string[] {
  return FALLBACK_LOCALES.map((locale) => locale.urlPrefix);
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
      const isLogoLink = anchor.classList.contains("logo-area");
      if (neutralPath === pathname || neutralPath === `${pathname}/`) return;

      captureSharedElementHandoff(anchor);
      event.preventDefault();
      safeAppRouterNavigate(router, neutralPath);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router, pathname]);

  return null;
}
