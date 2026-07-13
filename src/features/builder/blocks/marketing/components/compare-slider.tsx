"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  initialPosition?: number;
  showLabels?: boolean;
  className?: string;
};

export function CompareSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Before",
  afterLabel = "After",
  initialPosition = 50,
  showLabels = true,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const beforeImageRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const applyPosition = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    el.style.setProperty("--compare-pos", `${pct}%`);
    if (beforeImageRef.current) {
      beforeImageRef.current.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
    }
    if (dividerRef.current) {
      dividerRef.current.style.left = `${pct}%`;
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const pct = Math.max(0, Math.min(100, initialPosition));
    el.style.setProperty("--compare-pos", `${pct}%`);
    if (beforeImageRef.current) {
      beforeImageRef.current.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
    }
    if (dividerRef.current) {
      dividerRef.current.style.left = `${pct}%`;
    }
  }, [initialPosition]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    applyPosition(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    applyPosition(e.clientX);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-[16/10] cursor-ew-resize overflow-hidden rounded-xl select-none touch-none",
        className,
      )}
      style={{ ["--compare-pos" as string]: `${initialPosition}%` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {afterSrc && (
        <Image src={afterSrc} alt={afterLabel} fill className="object-cover" sizes="(max-width:768px) 100vw, 800px" />
      )}
      {beforeSrc && (
        <div
          ref={beforeImageRef}
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - initialPosition}% 0 0)` }}
        >
          <Image
            src={beforeSrc}
            alt={beforeLabel}
            fill
            className="object-cover"
            sizes="(max-width:768px) 100vw, 800px"
          />
        </div>
      )}
      <div
        ref={dividerRef}
        className="pointer-events-none absolute inset-y-0 z-10 w-1 bg-white shadow-lg"
        style={{ left: `${initialPosition}%`, transform: "translateX(-50%)" }}
      >
        <div className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-md">
          <span className="text-xs">↔</span>
        </div>
      </div>
      {showLabels && (
        <>
          <span className="absolute top-3 left-3 rounded bg-black/60 px-2 py-1 text-xs text-white">
            {beforeLabel}
          </span>
          <span className="absolute top-3 right-3 rounded bg-black/60 px-2 py-1 text-xs text-white">
            {afterLabel}
          </span>
        </>
      )}
    </div>
  );
}
