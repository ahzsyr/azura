/**
 * Shared motion tokens for the public marketing site — aligned with admin dashboard.
 */
export const PUBLIC_MOTION = {
  ease: [0.22, 1, 0.36, 1] as const,
  easeCss: "cubic-bezier(0.22, 1, 0.36, 1)",
  enterDuration: 0.22,
  exitDuration: 0.16,
  revealDuration: 0.5,
  revealDurationMobile: 0.4,
  stagger: 0.02,
  staggerMs: 60,
  staggerMaxMs: 360,
  routeEnterClearMs: 240,
  /** GSAP ease closest to easeCss — used when GSAP handles hero entrance. */
  gsapEase: "power2.out",
} as const;

export const PUBLIC_MOTION_MOBILE = {
  ease: [0.22, 1, 0.36, 1] as const,
  enterDuration: 0.12,
  exitDuration: 0.1,
  revealDuration: 0.4,
} as const;
