/** Last snap stays flush with the row end so the previous card peeks in. */
export const sliderPeekOpts = {
  align: "start" as const,
  loop: false as const,
  containScroll: "trimSnaps" as const,
};

function clampPeekCount(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(6, Math.max(1, Math.round(n)));
}

/** Slide width that fits `n` cards plus a 0.2 peek of the next one. */
export function peekBasis(n: number, breakpoint?: "sm" | "md" | "lg"): string {
  const count = clampPeekCount(n) + 0.2;
  const prefix = breakpoint ? `${breakpoint}:` : "";
  return `${prefix}basis-[calc(100%/${count})]`;
}

/**
 * Responsive peek that matches the previous integer breakpoints:
 * 1 → 1.2, 2 → 1.2 then 2.2 from sm, 3+ → 1.2, 2.2 from sm, n.2 from lg.
 */
export function responsivePeekBasis(slidesPerView: number): string {
  const n = clampPeekCount(slidesPerView);
  if (n <= 1) return peekBasis(1);
  if (n === 2) return `${peekBasis(1)} ${peekBasis(2, "sm")}`;
  return `${peekBasis(1)} ${peekBasis(2, "sm")} ${peekBasis(n, "lg")}`;
}

/** `data-peek` value for native tracks (1–6). */
export function peekCountAttr(slidesPerView: number): string {
  return String(clampPeekCount(slidesPerView));
}
