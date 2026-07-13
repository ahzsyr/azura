"use client";

import { useEffect, useState } from "react";

export type ToolbarTier = "mobile" | "tablet" | "laptop" | "desktop";

export function useToolbarTier(): ToolbarTier {
  const [tier, setTier] = useState<ToolbarTier>("desktop");

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setTier("mobile");
      else if (w < 1024) setTier("tablet");
      else if (w < 1280) setTier("laptop");
      else setTier("desktop");
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return tier;
}
