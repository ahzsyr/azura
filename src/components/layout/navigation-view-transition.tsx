"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { runWithViewTransition } from "@/lib/theme/effects/transition-engine";

function isInternalNavigationLink(anchor: HTMLAnchorElement): boolean {
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
  try {
    const url = new URL(href, window.location.origin);
    return url.origin === window.location.origin;
  } catch {
    return href.startsWith("/");
  }
}

/**
 * Intercepts same-origin link clicks and navigates through the View Transitions API
 * when supported, for smoother page-to-page visual handoff.
 */
export function NavigationViewTransition() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (typeof document.startViewTransition !== "function") return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isInternalNavigationLink(anchor)) return;

      const href = anchor.getAttribute("href") ?? "";
      const [pathPart] = href.split("#");
      if (!pathPart || pathPart === pathname || pathPart === `${pathname}/`) return;

      event.preventDefault();
      event.stopPropagation();

      runWithViewTransition(() => {
        router.push(href);
      });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router, pathname]);

  return null;
}
