"use client";

import { useEffect, useRef, useState } from "react";
import { useActiveDeviceBreakpoint } from "@/lib/hooks/use-active-device-breakpoint";
import type { DeviceBreakpoint } from "@/types/block-system";

/**
 * Holds the last device breakpoint while a pointer/touch is active so overflow
 * shells do not remount mid-gesture (orientation change, soft keyboard, etc.).
 */
export function useStableDeviceBreakpoint(): DeviceBreakpoint {
  const activeDevice = useActiveDeviceBreakpoint();
  const [stableDevice, setStableDevice] = useState<DeviceBreakpoint>(activeDevice);
  const pointerActiveRef = useRef(false);
  const pendingDeviceRef = useRef<DeviceBreakpoint | null>(null);

  useEffect(() => {
    if (!pointerActiveRef.current) {
      setStableDevice(activeDevice);
      return;
    }
    pendingDeviceRef.current = activeDevice;
  }, [activeDevice]);

  useEffect(() => {
    const releasePointer = () => {
      pointerActiveRef.current = false;
      if (pendingDeviceRef.current != null) {
        setStableDevice(pendingDeviceRef.current);
        pendingDeviceRef.current = null;
      }
    };

    const onPointerDown = () => {
      pointerActiveRef.current = true;
    };

    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("pointerup", releasePointer, { passive: true });
    document.addEventListener("pointercancel", releasePointer, { passive: true });
    document.addEventListener("touchend", releasePointer, { passive: true });
    document.addEventListener("touchcancel", releasePointer, { passive: true });

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", releasePointer);
      document.removeEventListener("pointercancel", releasePointer);
      document.removeEventListener("touchend", releasePointer);
      document.removeEventListener("touchcancel", releasePointer);
    };
  }, []);

  return stableDevice;
}
