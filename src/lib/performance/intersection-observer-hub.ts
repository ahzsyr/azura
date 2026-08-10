type EntryHandler = (entry: IntersectionObserverEntry) => void;

type ObserverBucket = {
  observer: IntersectionObserver;
  handlers: Map<Element, Set<EntryHandler>>;
};

const buckets = new Map<string, ObserverBucket>();

function bucketKey(options: IntersectionObserverInit): string {
  const root =
    options.root instanceof Element
      ? `el:${options.root.tagName}:${options.root.id || options.root.className}`
      : "viewport";
  const margin = options.rootMargin ?? "0px";
  const threshold = Array.isArray(options.threshold)
    ? options.threshold.join(",")
    : String(options.threshold ?? 0);
  return `${root}|${margin}|${threshold}`;
}

function getBucket(options: IntersectionObserverInit): ObserverBucket {
  const key = bucketKey(options);
  let bucket = buckets.get(key);
  if (!bucket) {
    const handlers = new Map<Element, Set<EntryHandler>>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const set = handlers.get(entry.target);
        if (!set) continue;
        for (const handler of set) {
          handler(entry);
        }
      }
    }, options);
    bucket = { observer, handlers };
    buckets.set(key, bucket);
  }
  return bucket;
}

/**
 * Shared IntersectionObserver — one instance per unique root/rootMargin/threshold.
 */
export function observeIntersection(
  element: Element,
  handler: EntryHandler,
  options: IntersectionObserverInit = {},
): () => void {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
    return () => {};
  }

  const bucket = getBucket(options);
  let set = bucket.handlers.get(element);
  if (!set) {
    set = new Set();
    bucket.handlers.set(element, set);
    bucket.observer.observe(element);
  }
  set.add(handler);

  return () => {
    const current = bucket.handlers.get(element);
    if (!current) return;
    current.delete(handler);
    if (current.size === 0) {
      bucket.handlers.delete(element);
      bucket.observer.unobserve(element);
    }
  };
}

/**
 * Observe an element once — auto-unsubscribes after the first intersecting callback.
 */
export function observeOnce(
  element: Element,
  handler: EntryHandler,
  options: IntersectionObserverInit = {},
): () => void {
  let off: (() => void) | null = null;
  off = observeIntersection(
    element,
    (entry) => {
      if (!entry.isIntersecting) return;
      handler(entry);
      off?.();
    },
    options,
  );
  return () => off?.();
}
