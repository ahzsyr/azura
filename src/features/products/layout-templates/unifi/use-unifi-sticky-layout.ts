"use client";

import { useEffect, type RefObject } from "react";

/** Live bottom edge of the site header in the viewport (boxed/floating aware). */
function readHeaderBottomPx(): number {
  const header =
    document.getElementById("headerRoot") ?? document.querySelector<HTMLElement>(".header-root");
  if (header) {
    const rect = header.getBoundingClientRect();
    if (rect.height > 0) {
      return Math.max(0, Math.ceil(rect.bottom > 0 ? rect.bottom : rect.height));
    }
  }
  const html = document.documentElement;
  const cssHeader = parseFloat(getComputedStyle(html).getPropertyValue("--header-height").trim()) || 76;
  const overlay = parseFloat(getComputedStyle(html).getPropertyValue("--header-overlay-top-gap").trim()) || 0;
  return Math.ceil(cssHeader + overlay);
}

/** Keep UniFi sticky chrome flush under the live site header. */
export function useUniFiStickyLayout(rootRef: RefObject<HTMLElement | null>, _stickyVisible: boolean): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const sync = () => {
      const headerOffset = readHeaderBottomPx();
      const stack = root.querySelector<HTMLElement>(".unifi-sticky-stack");
      const stackHeight = stack ? Math.ceil(stack.getBoundingClientRect().height) : 0;
      root.style.setProperty("--unifi-header-offset", `${headerOffset}px`);
      root.style.setProperty("--unifi-sticky-stack-h", `${stackHeight || 48}px`);
      root.style.setProperty("--unifi-tab-top", `${headerOffset}px`);
      document.documentElement.style.setProperty("--unifi-header-offset", `${headerOffset}px`);
    };

    sync();
    requestAnimationFrame(sync);
    window.addEventListener("resize", sync, { passive: true });
    window.addEventListener("scroll", sync, { passive: true });
    const observer = new ResizeObserver(sync);
    observer.observe(root);
    const header = document.getElementById("headerRoot") ?? document.querySelector(".header-root");
    if (header) observer.observe(header);
    const stack = root.querySelector(".unifi-sticky-stack");
    if (stack) observer.observe(stack);

    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync);
      observer.disconnect();
    };
  }, [rootRef, _stickyVisible]);
}
