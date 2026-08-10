"use client";

import { useCallback, useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (delayMs <= 0) return;
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return delayMs <= 0 ? value : debounced;
}

/** Debounced value with synchronous flush (e.g. immediate clear on filter reset). */
export function useDebouncedValueWithFlush<T>(value: T, delayMs = 300): readonly [T, (next: T) => void] {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (delayMs <= 0) return;
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  const flush = useCallback((next: T) => {
    setDebounced(next);
  }, []);

  return [delayMs <= 0 ? value : debounced, flush] as const;
}
