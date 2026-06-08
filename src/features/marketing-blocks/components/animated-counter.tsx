"use client";

import { useEffect, useRef } from "react";
import { animate, useMotionValue, useReducedMotion } from "framer-motion";
import { observeOnce } from "@/lib/performance/intersection-observer-hub";
import { waitUntilVisible } from "@/lib/performance/wait-until-visible";
import { useConstrainedMotion } from "@/hooks/use-constrained-motion";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  animateOnView?: boolean;
  className?: string;
};

function formatCounter(prefix: string, n: number, suffix: string): string {
  return `${prefix}${n.toLocaleString()}${suffix}`;
}

export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  duration = 1500,
  animateOnView = true,
  className,
}: Props) {
  const osReduced = useReducedMotion();
  const { shouldReduceMotion, shouldSimplifyMotion } = useConstrainedMotion();
  const motionValue = useMotionValue(value);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  const controlsRef = useRef<ReturnType<typeof animate> | null>(null);

  const effectiveDuration = shouldSimplifyMotion ? duration * 0.7 : duration;
  const skipAnimation = !animateOnView || shouldReduceMotion || osReduced;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const write = (n: number) => {
      el.textContent = formatCounter(prefix, n, suffix);
    };

    if (skipAnimation) {
      motionValue.set(value);
      write(value);
      return;
    }

    started.current = false;
    motionValue.set(0);
    write(0);

    let cancelled = false;

    const off = observeOnce(
      el,
      () => {
        if (started.current || cancelled) return;

        void waitUntilVisible(el, shouldSimplifyMotion ? 300 : 600).then(() => {
          if (started.current || cancelled) return;
          started.current = true;

          controlsRef.current?.stop();
          controlsRef.current = animate(motionValue, value, {
            duration: effectiveDuration / 1000,
            ease: [0.22, 1, 0.36, 1],
            onUpdate: (v) => write(Math.round(v)),
          });
        });
      },
      {
        threshold: shouldSimplifyMotion ? 0.15 : 0.2,
        rootMargin: shouldSimplifyMotion ? "0px 0px 120px 0px" : "0px 0px -5% 0px",
      },
    );

    return () => {
      cancelled = true;
      off();
      controlsRef.current?.stop();
    };
  }, [
    value,
    effectiveDuration,
    animateOnView,
    skipAnimation,
    motionValue,
    prefix,
    suffix,
    shouldSimplifyMotion,
  ]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {formatCounter(prefix, skipAnimation ? value : 0, suffix)}
    </span>
  );
}
