"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { observeOnce } from "@/lib/performance/intersection-observer-hub";
import { waitUntilVisible } from "@/lib/performance/wait-until-visible";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  animateOnView?: boolean;
  className?: string;
};

export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  duration = 1500,
  animateOnView = true,
  className,
}: Props) {
  const reduced = useReducedMotion();
  const motionValue = useMotionValue(animateOnView && !reduced ? 0 : value);
  const displayRounded = useTransform(motionValue, (v) => Math.round(v));
  const [display, setDisplay] = useState(animateOnView && !reduced ? 0 : value);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  const controlsRef = useRef<ReturnType<typeof animate> | null>(null);

  useEffect(() => {
    if (!animateOnView || reduced) {
      motionValue.set(value);
      setDisplay(value);
      return;
    }

    const el = ref.current;
    if (!el) return;

    started.current = false;
    motionValue.set(0);
    setDisplay(0);

    let cancelled = false;

    const off = observeOnce(
      el,
      () => {
        if (started.current || cancelled) return;

        void waitUntilVisible(el).then(() => {
          if (started.current || cancelled) return;
          started.current = true;

          controlsRef.current?.stop();
          controlsRef.current = animate(motionValue, value, {
            duration: duration / 1000,
            ease: [0.22, 1, 0.36, 1],
          });
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -5% 0px" },
    );

    return () => {
      cancelled = true;
      off();
      controlsRef.current?.stop();
    };
  }, [value, duration, animateOnView, reduced, motionValue]);

  useEffect(() => {
    const unsub = displayRounded.on("change", (v) => setDisplay(v));
    return () => unsub();
  }, [displayRounded]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}
