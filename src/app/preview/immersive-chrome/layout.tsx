import type { ReactNode } from "react";

/** Minimal shell — no marketing header/footer; preview path skips locale middleware. */
export default function ImmersiveChromeLayout({ children }: { children: ReactNode }) {
  return children;
}
