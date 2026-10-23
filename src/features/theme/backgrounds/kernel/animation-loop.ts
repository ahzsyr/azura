/** Full-screen overlays that hide the page; drawing under them only steals frames. */
function pageCoveredByOverlay(): boolean {
  return document.documentElement.classList.contains("mnav-open");
}

/** Schedules canvas draw loops that skip work while the tab is hidden or covered. */
export function runCanvasLoop(
  draw: () => void,
  options?: { isActive?: () => boolean },
): () => void {
  let active = true;
  let frameId = 0;
  const isActive = options?.isActive ?? (() => true);

  const loop = () => {
    if (!active) return;
    if (!document.hidden && !pageCoveredByOverlay() && isActive()) {
      draw();
    }
    frameId = requestAnimationFrame(loop);
  };

  frameId = requestAnimationFrame(loop);

  return () => {
    active = false;
    cancelAnimationFrame(frameId);
  };
}

export function getTieredParticleCount(defaultCount: number, intensity = 1): number {
  if (typeof document === "undefined") return defaultCount;
  const tier = document.documentElement.dataset.effectsTier;
  let count = defaultCount;
  if (tier === "medium") count = Math.round(defaultCount * 0.75);
  if (tier === "light") count = Math.round(defaultCount * 0.5);
  return Math.max(4, Math.round(count * intensity));
}
