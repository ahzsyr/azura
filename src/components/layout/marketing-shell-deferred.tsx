"use client";

import dynamic from "next/dynamic";
import type { ResolvedSitePreloader } from "@/features/preloader/resolve-site-preloader";

export { ScrollRevealObserver as ScrollRevealObserverHost } from "@/components/motion/scroll-reveal-observer";
export { MotionRuntimeHost } from "@/components/motion/motion-runtime-host";
export { NavigationMotionLifecycle } from "@/components/motion/navigation-motion-lifecycle";
export { SitePreloader as SitePreloaderHost } from "@/components/layout/site-preloader";

export const DeferredScrollRevealObserver = dynamic(
  () =>
    import("@/components/motion/scroll-reveal-observer").then(
      (m) => m.ScrollRevealObserver,
    ),
  { ssr: false },
);

export const DeferredRecentlyViewedTracker = dynamic(
  () =>
    import("@/features/builder/blocks/discovery/components/recently-viewed-tracker").then(
      (m) => m.RecentlyViewedTracker,
    ),
  { ssr: false },
);

export const DeferredNavigationProgress = dynamic(
  () =>
    import("@/components/layout/navigation-progress").then((m) => m.NavigationProgress),
  { ssr: false },
);

export const DeferredNavigationViewTransition = dynamic(
  () =>
    import("@/components/layout/navigation-view-transition").then(
      (m) => m.NavigationViewTransition,
    ),
  { ssr: false },
);

const DeferredSitePreloader = dynamic(
  () => import("@/components/layout/site-preloader").then((m) => m.SitePreloader),
  { ssr: false },
);

export function DeferredSitePreloaderHost(props: { settings: ResolvedSitePreloader }) {
  return <DeferredSitePreloader {...props} />;
}

export const DeferredWhatsAppFab = dynamic(
  () => import("@/components/layout/whatsapp-fab").then((m) => m.WhatsAppFab),
  { ssr: false },
);

export const DeferredThemeToggleFab = dynamic(
  () => import("@/components/theme/theme-toggle-fab").then((m) => m.ThemeToggleFab),
  { ssr: false },
);

const DeferredThemePerformanceMonitor = dynamic(
  () =>
    import("@/components/performance/theme-performance-monitor").then(
      (m) => m.ThemePerformanceMonitor,
    ),
  { ssr: false },
);

export function ThemePerformanceMonitorDeferred() {
  return <DeferredThemePerformanceMonitor />;
}
