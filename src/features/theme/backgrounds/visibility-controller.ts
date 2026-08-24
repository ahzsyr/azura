import { observeIntersection } from "@/lib/performance/intersection-observer-hub";

/** Pause canvas draws when a section host leaves the viewport. */
export function bindVisibilityPause(
  root: HTMLElement,
  onVisibleChange: (visible: boolean) => void,
): () => void {
  let visible = true;
  return observeIntersection(
    root,
    (entry) => {
      const next = entry.isIntersecting;
      if (next !== visible) {
        visible = next;
        onVisibleChange(next);
      }
    },
    { rootMargin: "80px", threshold: 0 },
  );
}
