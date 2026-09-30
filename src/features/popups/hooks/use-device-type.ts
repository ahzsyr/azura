"use client";

import { useEffect, useState } from "react";
import { getDeviceType, type DeviceType } from "@/features/popups/lib/popup-targeting";

export function useDeviceType(): DeviceType {
  const [device, setDevice] = useState<DeviceType>("desktop");

  useEffect(() => {
    const update = () => setDevice(getDeviceType(window.innerWidth));
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  return device;
}
