"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";

type Options = {
  storageKey: string;
  minRatio?: number;
  maxRatio?: number;
  dragThresholdPx?: number;
  defaultRatio?: number;
};

type DragState = {
  pointerId: number;
  startY: number;
  startRatio: number;
  moved: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readStoredRatio(storageKey: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw == null) return fallback;
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function useEdgeDragPosition({
  storageKey,
  minRatio = 0.12,
  maxRatio = 0.88,
  dragThresholdPx = 6,
  defaultRatio = 0.5,
}: Options) {
  const [offsetRatio, setOffsetRatio] = useState(defaultRatio);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    setOffsetRatio(readStoredRatio(storageKey, defaultRatio));
  }, [storageKey, defaultRatio]);

  const persistRatio = useCallback(
    (ratio: number) => {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(storageKey, String(ratio));
      } catch {
        /* ignore quota / private mode */
      }
    },
    [storageKey],
  );

  const ratioFromClientY = useCallback(
    (clientY: number) => {
      const height = window.innerHeight || 1;
      return clamp(clientY / height, minRatio, maxRatio);
    },
    [minRatio, maxRatio],
  );

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startRatio: offsetRatio,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [offsetRatio]);

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      const deltaY = Math.abs(event.clientY - drag.startY);
      if (!drag.moved && deltaY < dragThresholdPx) return;

      drag.moved = true;
      setIsDragging(true);
      setOffsetRatio(ratioFromClientY(event.clientY));
    },
    [dragThresholdPx, ratioFromClientY],
  );

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      if (drag.moved) {
        const next = ratioFromClientY(event.clientY);
        setOffsetRatio(next);
        persistRatio(next);
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      }

      dragRef.current = null;
      setIsDragging(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [persistRatio, ratioFromClientY],
  );

  const onPointerCancel = useCallback((event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const positionStyle: CSSProperties = {
    top: `${offsetRatio * 100}%`,
    transform: "translateY(-50%)",
  };

  return {
    offsetRatio,
    isDragging,
    positionStyle,
    suppressClickRef,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}
