"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function IconGrid({ children }: Props) {
  return <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">{children}</div>;
}

