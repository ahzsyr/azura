"use client";

import dynamic from "next/dynamic";

/** Code-split framer-motion — client-only to avoid SSR/hydration cost */
export const AnimatedSection = dynamic(
  () => import("./animated-section").then((m) => m.AnimatedSection),
  { ssr: false },
);

export const FadeIn = dynamic(
  () => import("./animated-section").then((m) => m.FadeIn),
  { ssr: false },
);

export const HoverCard = dynamic(
  () => import("./animated-section").then((m) => m.HoverCard),
  { ssr: false },
);
