"use client";

import { useLayoutEffect, useRef } from "react";
import type { HeroAnimationsConfig } from "@/features/marketing-blocks/lib/hero-animations";
import { getConstrainedMotionSnapshot } from "@/lib/motion/constrained-motion-snapshot";
import { bindParallaxElement } from "@/lib/motion/parallax-scroll";
import { PUBLIC_MOTION } from "@/lib/motion/public-motion";

type Props = {
  animations?: HeroAnimationsConfig;
  imagePosition?: string;
  hasParallaxBg?: boolean;
};

const HERO_MOTION_ARMED_CLASS = "hero-motion-armed";

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
    const html = document.documentElement;
    const { shouldReduceMotion, shouldSimplifyMotion } = getConstrainedMotionSnapshot();
    const skipMotion = shouldReduceMotion || shouldSimplifyMotion;

    if (skipMotion) {
      html.classList.remove(HERO_MOTION_ARMED_CLASS);
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
      html.classList.add(HERO_MOTION_ARMED_CLASS);

      let cancelled = false;
      void import("gsap")
        .then((mod) => {
          if (cancelled) return;
          mod.gsap.to(entrances, {
            opacity: 1,
            y: 0,
            x: 0,
            duration,
            stagger: staggerDelay,
            ease: PUBLIC_MOTION.gsapEase,
            delay: 0.08,
            onComplete: () => {
              html.classList.remove(HERO_MOTION_ARMED_CLASS);
              entrances.forEach((el) => {
                el.style.willChange = "auto";
              });
            },
          });
        })
        .catch(() => {
          html.classList.remove(HERO_MOTION_ARMED_CLASS);
          revealEntrances(root);
        });

      cleanups.push(() => {
        cancelled = true;
        html.classList.remove(HERO_MOTION_ARMED_CLASS);
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

    return () => {
      html.classList.remove(HERO_MOTION_ARMED_CLASS);
      for (const off of cleanups) off();
    };
  }, [animations, imagePosition, hasParallaxBg]);

  return <span ref={rootRef} className="sr-only" aria-hidden data-hero-motion-sentinel />;
}
