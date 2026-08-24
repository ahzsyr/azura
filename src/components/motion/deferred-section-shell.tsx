"use client";

import type { ReactNode } from "react";
import { LazyInView } from "@/components/ui/lazy-in-view";

type Props = {
  children: ReactNode;
  minHeight?: number | string;
  className?: string;
};

/** Defers mounting below-fold server content until near the viewport. */
export function DeferredSectionShell({
  children,
  minHeight = 240,
  className,
}: Props) {
  return (
    <LazyInView minHeight={minHeight} rootMargin="240px 0px" className={className}>
      {children}
    </LazyInView>
  );
}
