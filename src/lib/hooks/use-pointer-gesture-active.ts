"use client";

import { useCallback, useEffect, useRef } from "react";

/** Tracks whether a pointer/touch gesture is currently active on the document. */
export function usePointerGestureActive() {
  const gestureActiveRef = useRef(false);
  const pendingCallbacksRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    const flushPending = () => {
      if (gestureActiveRef.current) return;
      const pending = pendingCallbacksRef.current.splice(0);
      for (const callback of pending) {
        callback();
      }
    };

    const onPointerDown = () => {
      gestureActiveRef.current = true;
    };

    const onPointerUp = () => {
      gestureActiveRef.current = false;
      flushPending();
    };

    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("pointerup", onPointerUp, { passive: true });
    document.addEventListener("pointercancel", onPointerUp, { passive: true });
    document.addEventListener("touchend", onPointerUp, { passive: true });
    document.addEventListener("touchcancel", onPointerUp, { passive: true });

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
      document.removeEventListener("touchend", onPointerUp);
      document.removeEventListener("touchcancel", onPointerUp);
    };
  }, []);

  const runWhenGestureIdle = useCallback((callback: () => void) => {
    if (!gestureActiveRef.current) {
      callback();
      return;
    }
    pendingCallbacksRef.current.push(callback);
  }, []);

  return { gestureActiveRef, runWhenGestureIdle };
}
