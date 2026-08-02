"use client";

import { useEffect, useRef } from "react";
import { useResolvedVisualExperience } from "@/components/theme/visual-experience-context";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  animateOnView?: boolean;
  className?: string;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  duration = 1500,
  animateOnView = true,
  className,
}: Props) {
  const resolved = useResolvedVisualExperience();
  const ref = useRef<HTMLSpanElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const skipAnimation =
      !animateOnView ||
      prefersReducedMotion() ||
      resolved?.animationsEnabled === false;

    if (skipAnimation) {
      started.current = true;
      if (valueRef.current) {
        valueRef.current.textContent = value.toLocaleString();
      }
      return;
    }

    started.current = false;
    if (valueRef.current) {
      valueRef.current.textContent = "0";
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || started.current) return;
        started.current = true;

        const start = performance.now();
        const from = 0;
        const to = value;

        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const next = Math.round(from + (to - from) * eased);
          if (valueRef.current) {
            valueRef.current.textContent = next.toLocaleString();
          }
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration, animateOnView, resolved?.animationsEnabled]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      <span ref={valueRef}>{value.toLocaleString()}</span>
      {suffix}
    </span>
  );
}
