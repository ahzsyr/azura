/** Schedules canvas draw loops that skip work while the tab is hidden. */
export function runCanvasLoop(draw: () => void): () => void {
  let active = true;
  let frameId = 0;

  const loop = () => {
    if (!active) return;
    if (!document.hidden) {
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

export function getTieredParticleCount(defaultCount: number): number {
  if (typeof document === "undefined") return defaultCount;
  const tier = document.documentElement.dataset.effectsTier;
  if (tier === "medium") return Math.round(defaultCount * 0.75);
  if (tier === "light") return Math.round(defaultCount * 0.5);
  return defaultCount;
}
