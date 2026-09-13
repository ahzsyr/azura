/** Schedule work after first paint / when the browser is idle. */
export function deferUntilIdle(work: () => void, timeoutMs = 2500): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(work, { timeout: timeoutMs });
    return () => cancelIdleCallback(id);
  }

  const id = setTimeout(work, 1);
  return () => clearTimeout(id);
}
