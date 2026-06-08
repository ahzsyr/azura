"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { observeOnce } from "@/lib/performance/intersection-observer-hub";
import { cn } from "@/lib/utils";

type LazyInViewProps = {
  children: ReactNode;
  className?: string;
  minHeight?: number | string;
  rootMargin?: string;
  /** CSS scroll-reveal animation (skip when lazy-mounting children) */
  reveal?: boolean;
  as?: "div" | "section" | "li" | "tr";
};

export function LazyInView({
  children,
  className,
  minHeight = 64,
  rootMargin = "120px 0px",
  reveal = false,
  as: Tag = "div",
}: LazyInViewProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setVisible(true);
      return;
    }

    return observeOnce(
      el,
      () => {
        setVisible(true);
      },
      { rootMargin, threshold: 0.01 },
    );
  }, [rootMargin]);

  return (
    <Tag
      ref={ref as never}
      className={cn(
        "az-lazy-paint az-content-auto",
        reveal && "data-scroll-reveal",
        visible && reveal && "az-in-view",
        className,
      )}
      style={!visible ? { minHeight } : undefined}
      data-lazy-mounted={visible ? "true" : "false"}
    >
      {visible ? children : null}
    </Tag>
  );
}
