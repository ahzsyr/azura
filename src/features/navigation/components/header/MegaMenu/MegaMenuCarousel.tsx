"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  enabled?: boolean;
  arrows?: boolean;
  className?: string;
};

export function MegaMenuCarousel({ children, enabled, arrows = true, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.6), behavior: "smooth" });
  };

  return (
    <div className={cn("hb-mega-v2-carousel", className)}>
      <div className="hb-mega-v2-carousel__track" ref={ref}>
        {children}
      </div>
      {arrows ? (
        <>
          <button
            type="button"
            className="hb-mega-v2-carousel__arrow hb-mega-v2-carousel__arrow--prev"
            aria-label="Previous"
            onClick={() => scrollBy(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="hb-mega-v2-carousel__arrow hb-mega-v2-carousel__arrow--next"
            aria-label="Next"
            onClick={() => scrollBy(1)}
          >
            ›
          </button>
        </>
      ) : null}
    </div>
  );
}
