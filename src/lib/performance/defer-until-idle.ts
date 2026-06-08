/** Schedule work after first paint / when the browser is idle. */
export function deferUntilIdle(work: () => void, timeoutMs = 2500): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(work, { timeout: timeoutMs });
    return () => window.cancelIdleCallback(id);
  }

  const id = window.setTimeout(work, 1);
  return () => window.clearTimeout(id);
}
