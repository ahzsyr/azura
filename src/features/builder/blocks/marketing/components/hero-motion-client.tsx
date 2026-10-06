"use client";

import { useLayoutEffect, useRef } from "react";
import { animate } from "motion";
import type { HeroAnimationsConfig } from "@/features/builder/blocks/marketing/lib/hero-animations";
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
 * Imperative hero entrance motion (typewriter, Motion stagger, parallax).
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
        entrances.forEach((el, index) => {
          const fromY = el.classList.contains("hero-anim-fade-up") ? 40 : 0;
          let fromX = 0;
          if (el.classList.contains("hero-anim-slide-in")) {
            fromX = el.classList.contains("hero-anim-subheading") ? 40 : -40;
          }
          el.style.opacity = "0";
          el.style.transform = `translate3d(${fromX}px, ${fromY}px, 0)`;
          const controls = animate(
            el,
            { opacity: 1, x: 0, y: 0 },
            {
              duration,
              delay: 0.08 + index * staggerDelay,
              ease: PUBLIC_MOTION.ease,
            },
          );
          void controls.then(() => {
            el.style.willChange = "auto";
          });
          cleanups.push(() => {
            controls.stop();
          });
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
