"use client";

import { useLayoutEffect, useRef } from "react";
import type { HeroAnimationsConfig } from "@/features/marketing-blocks/lib/hero-animations";
import { flashDebugLog } from "@/lib/debug/flash-debug-log";
import { getConstrainedMotionSnapshot } from "@/lib/motion/constrained-motion-snapshot";
import { bindParallaxElement } from "@/lib/motion/parallax-scroll";
import { whenShellReady } from "@/lib/motion/shell-ready";
import { PUBLIC_MOTION } from "@/lib/motion/public-motion";

type Props = {
  animations?: HeroAnimationsConfig;
  imagePosition?: string;
  hasParallaxBg?: boolean;
};

function revealEntrances(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>(".hero-anim-entrance").forEach((el) => {
    el.style.opacity = "1";
    el.style.transform = "none";
    el.style.willChange = "auto";
  });
}

/**
 * Imperative hero entrance motion (typewriter, GSAP stagger, parallax).
 */
export function HeroMotionClient({ animations, imagePosition, hasParallaxBg }: Props) {
  const rootRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current?.closest<HTMLElement>('[data-block-type="hero"]');
    if (!root) return;

    const cleanups: Array<() => void> = [];
    const { shouldReduceMotion, shouldSimplifyMotion } = getConstrainedMotionSnapshot();
    const skipMotion = shouldReduceMotion || shouldSimplifyMotion;

    const runMotion = () => {
      if (skipMotion) {
        revealEntrances(root);
        return;
      }

      const headingEffect = animations?.headingEffect;
      const staggerDelay = animations?.staggerDelay ?? 0.15;
      const duration = shouldSimplifyMotion
        ? PUBLIC_MOTION.enterDuration
        : (animations?.animationDuration ?? 0.8);
      const entrances = [...root.querySelectorAll<HTMLElement>(".hero-anim-entrance")];

      // #region agent log
      flashDebugLog({
        location: "hero-motion-client.tsx:runMotion",
        message: "Hero motion starting",
        hypothesisId: "H6",
        runId: "post-fix",
        data: {
          headingEffect,
          entranceCount: entrances.length,
          perfNow: performance.now(),
        },
      });
      // #endregion

      if (headingEffect === "typewriter") {
        const heading = root.querySelector<HTMLElement>(".hero-anim-heading");
        if (heading?.textContent) {
          const text = heading.textContent;
          const speed = window.innerWidth < 640 ? 60 : 100;
          const timer = window.setTimeout(() => {
            heading.textContent = "";
            let i = 0;
            const typeTimer = window.setInterval(() => {
              if (i < text.length) {
                heading.textContent += text.charAt(i);
                i += 1;
              } else {
                window.clearInterval(typeTimer);
              }
            }, speed);
            cleanups.push(() => window.clearInterval(typeTimer));
          }, 120);
          cleanups.push(() => window.clearTimeout(timer));
        }
      } else if (headingEffect !== "glitch" && entrances.length > 0) {
        let cancelled = false;
        void import("gsap")
          .then((mod) => {
            if (cancelled) return;
            mod.gsap.from(entrances, {
              opacity: 0,
              y: (_index, el) => {
                const node = el as HTMLElement;
                return node.classList.contains("hero-anim-fade-up") ? 40 : 0;
              },
              x: (_index, el) => {
                const node = el as HTMLElement;
                if (!node.classList.contains("hero-anim-slide-in")) return 0;
                return node.classList.contains("hero-anim-subheading") ? 40 : -40;
              },
              duration,
              stagger: staggerDelay,
              ease: PUBLIC_MOTION.gsapEase,
              delay: 0.08,
              onComplete: () => {
                entrances.forEach((el) => {
                  el.style.willChange = "auto";
                });
              },
            });
          })
          .catch(() => {
            revealEntrances(root);
          });

        cleanups.push(() => {
          cancelled = true;
        });
      }

      const parallaxSpeed = animations?.parallaxSpeed;
      if (
        parallaxSpeed &&
        parallaxSpeed > 0 &&
        imagePosition === "parallax" &&
        hasParallaxBg &&
        !shouldSimplifyMotion
      ) {
        const bg = root.querySelector<HTMLElement>(".parallax-bg");
        if (bg) {
          cleanups.push(bindParallaxElement(bg, parallaxSpeed));
        }
      }
    };

    const offShellReady = whenShellReady(runMotion);

    return () => {
      offShellReady();
      for (const off of cleanups) off();
    };
  }, [animations, imagePosition, hasParallaxBg]);

  return <span ref={rootRef} className="sr-only" aria-hidden data-hero-motion-sentinel />;
}
