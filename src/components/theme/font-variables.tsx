"use client";

import { useEffect } from "react";

/** Applies next/font CSS variable classes to <html> for self-hosted theme fonts. */
export function FontVariables({ classNames }: { classNames: string }) {
  useEffect(() => {
    const classes = classNames.split(" ").filter(Boolean);
    if (classes.length === 0) return;
    document.documentElement.classList.add(...classes);
    return () => {
      document.documentElement.classList.remove(...classes);
    };
  }, [classNames]);

  return null;
}
