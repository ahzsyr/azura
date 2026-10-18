"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPointerIdleQueue } from "@/lib/hooks/pointer-idle-queue";

/** Tracks whether a pointer/touch gesture is currently active on the document. */
export function usePointerGestureActive() {
  const queueRef = useRef<ReturnType<typeof createPointerIdleQueue> | null>(null);
  if (queueRef.current == null) {
    queueRef.current = createPointerIdleQueue();
  }

  useEffect(() => {
    const queue = queueRef.current;
    if (!queue) return;

    const onPointerDown = () => {
      queue.pointerDown();
    };
    const onPointerUp = () => {
      queue.pointerUp();
    };

    document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    document.addEventListener("pointerup", onPointerUp, { capture: true, passive: true });
    document.addEventListener("pointercancel", onPointerUp, { capture: true, passive: true });

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
      document.removeEventListener("pointerup", onPointerUp, { capture: true });
      document.removeEventListener("pointercancel", onPointerUp, { capture: true });
      queue.dispose();
      queueRef.current = createPointerIdleQueue();
    };
  }, []);

  const runWhenGestureIdle = useCallback((callback: () => void) => {
    queueRef.current?.runWhenIdle(callback);
  }, []);

  return { runWhenGestureIdle };
}
