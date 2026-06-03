"use client";

import dynamic from "next/dynamic";

/** Code-split framer-motion — keeps initial marketing bundle smaller */
export const AnimatedSection = dynamic(
  () => import("./animated-section").then((m) => m.AnimatedSection),
  { ssr: true }
);

export const FadeIn = dynamic(
  () => import("./animated-section").then((m) => m.FadeIn),
  { ssr: true }
);

export const HoverCard = dynamic(
  () => import("./animated-section").then((m) => m.HoverCard),
  { ssr: true }
);
