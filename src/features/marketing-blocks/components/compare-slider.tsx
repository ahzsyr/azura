"use client";

import { useCallback, useRef, useState } from "react";
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
  const [position, setPosition] = useState(initialPosition);
  const dragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.max(0, Math.min(100, pct)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    updatePosition(e.clientX);
  };

  const onPointerUp = () => {
    dragging.current = false;
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative aspect-[16/10] overflow-hidden rounded-xl select-none touch-none", className)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {afterSrc && (
        <Image src={afterSrc} alt={afterLabel} fill className="object-cover" sizes="(max-width:768px) 100vw, 800px" />
      )}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        {beforeSrc && (
          <Image
            src={beforeSrc}
            alt={beforeLabel}
            fill
            className="object-cover"
            sizes="(max-width:768px) 100vw, 800px"
            style={{ width: containerRef.current ? `${containerRef.current.offsetWidth}px` : "100%" }}
          />
        )}
      </div>
      <div
        className="absolute inset-y-0 z-10 w-1 cursor-ew-resize bg-white shadow-lg"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
        onPointerDown={onPointerDown}
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
