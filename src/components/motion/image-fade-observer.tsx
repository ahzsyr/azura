"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import { whenShellReady } from "@/lib/motion/shell-ready";
import { bootPageImageFade, wireAllPageImages } from "@/lib/performance/wire-page-images";

/**
 * Global lazy image fade-in (Astro performance-client parity).
 */
export function ImageFadeObserver() {
  const pathname = usePathname();

  useEffect(() => {
    let stopShell: (() => void) | undefined;
    const run = () => bootPageImageFade();
    stopShell = whenShellReady(run);
    return () => stopShell?.();
  }, []);

  useEffect(() => {
    wireAllPageImages(document);
  }, [pathname]);

  return null;
}
