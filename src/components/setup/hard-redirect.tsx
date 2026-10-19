"use client";

import { useEffect } from "react";

/** Full navigation. Used when an HTTP redirect would fail a Safari RSC fetch. */
export function HardRedirect({ href }: { href: string }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);

  return null;
}
