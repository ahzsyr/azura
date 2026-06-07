"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type LazyInViewProps = {
  children: ReactNode;
  className?: string;
  /** Placeholder height before content mounts */
  minHeight?: number | string;
  rootMargin?: string;
  reveal?: boolean;
  as?: "div" | "section" | "li" | "tr";
};

/**
 * Mounts children when near the viewport (lazy load). Optional scroll-reveal animation.
 */
export function LazyInView({
  children,
  className,
  minHeight = 64,
  rootMargin = "120px 0px",
  reveal = true,
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

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <Tag
      ref={ref as never}
      className={cn(
        "az-lazy-paint",
        reveal && "data-scroll-reveal",
        visible && reveal && "az-in-view",
        className
      )}
      style={!visible ? { minHeight } : undefined}
      data-lazy-mounted={visible ? "true" : "false"}
    >
      {visible ? children : null}
    </Tag>
  );
}
