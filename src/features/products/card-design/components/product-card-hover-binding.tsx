"use client";

import { useEffect, useRef } from "react";
import type { ProductCardHoverEffect } from "../product-card-design.types";

type Props = {
  hoverEffect: ProductCardHoverEffect;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ProductCardHoverBinding({ hoverEffect }: Props) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const card = ref.current?.closest(".pl-card") as HTMLElement | null;
    if (!card || prefersReducedMotion()) return;

    if (hoverEffect === "spotlight") {
      const onMove = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty("--spot-x", `${x}%`);
        card.style.setProperty("--spot-y", `${y}%`);
      };
      card.addEventListener("mousemove", onMove);
      return () => card.removeEventListener("mousemove", onMove);
    }

    if (hoverEffect === "tilt") {
      const onMove = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(800px) rotateX(${py * -6}deg) rotateY(${px * 6}deg)`;
      };
      const onLeave = () => {
        card.style.transform = "";
      };
      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", onLeave);
      return () => {
        card.removeEventListener("mousemove", onMove);
        card.removeEventListener("mouseleave", onLeave);
        card.style.transform = "";
      };
    }

    return undefined;
  }, [hoverEffect]);

  return <span ref={ref} className="pl-card__hover-bind" aria-hidden />;
}
