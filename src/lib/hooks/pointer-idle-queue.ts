export const POINTER_IDLE_FALLBACK_MS = 250;

export type PointerIdleQueue = {
  pointerDown: () => void;
  pointerUp: () => void;
  runWhenIdle: (callback: () => void) => void;
  dispose: () => void;
};

/**
 * Queues work while pointers are down. A second pointerdown does not restart
 * the fallback timer. When the timer fires, queued callbacks run even if a
 * pointer is still down.
 */
export function createPointerIdleQueue(
  schedule: (fn: () => void, ms: number) => ReturnType<typeof setTimeout> = (fn, ms) =>
    setTimeout(fn, ms),
  cancel: (id: ReturnType<typeof setTimeout>) => void = (id) => clearTimeout(id),
): PointerIdleQueue {
  let activePointers = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const pending: Array<() => void> = [];

  const flush = () => {
    timer = null;
    const callbacks = pending.splice(0, pending.length);
    for (const callback of callbacks) callback();
  };

  return {
    pointerDown() {
      activePointers += 1;
    },
    pointerUp() {
      activePointers = Math.max(0, activePointers - 1);
      if (activePointers > 0) return;
      if (timer != null) {
        cancel(timer);
        timer = null;
      }
      flush();
    },
    runWhenIdle(callback) {
      if (activePointers === 0) {
        callback();
        return;
      }
      pending.push(callback);
      if (timer != null) return;
      timer = schedule(flush, POINTER_IDLE_FALLBACK_MS);
    },
    dispose() {
      if (timer != null) cancel(timer);
      timer = null;
      pending.splice(0, pending.length);
    },
  };
}
