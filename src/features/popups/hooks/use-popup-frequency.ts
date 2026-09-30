"use client";

import { useCallback, useEffect, useState } from "react";
import type { PopupFrequency } from "@/features/popups/popup.schema";

type FrequencyRecord = {
  count: number;
  lastShownAt: number;
};

function readRecord(key: string): FrequencyRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`popup-freq:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FrequencyRecord;
    if (typeof parsed.count !== "number" || typeof parsed.lastShownAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeRecord(key: string, record: FrequencyRecord) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`popup-freq:${key}`, JSON.stringify(record));
  } catch {
    /* ignore quota */
  }
}

function readSessionCount(key: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.sessionStorage.getItem(`popup-freq:${key}`);
    return raw ? Number.parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function writeSessionCount(key: string, count: number) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`popup-freq:${key}`, String(count));
  } catch {
    /* ignore */
  }
}

function isDismissed(dismissKey: string): boolean {
  if (!dismissKey || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(`dismiss:${dismissKey}`) === "1";
  } catch {
    return false;
  }
}

export function markPopupDismissed(dismissKey: string) {
  if (!dismissKey || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`dismiss:${dismissKey}`, "1");
  } catch {
    /* ignore */
  }
}

function canShowByFrequency(frequency: PopupFrequency, now: number): boolean {
  const key = frequency.storageKey.trim();
  if (!key) return true;

  if (frequency.mode === "always") return true;

  if (frequency.mode === "once") {
    const record = readRecord(key);
    return !record || record.count < 1;
  }

  if (frequency.mode === "session") {
    return readSessionCount(key) < Math.max(1, frequency.maxImpressions);
  }

  if (frequency.mode === "daily") {
    const record = readRecord(key);
    if (!record) return true;
    const dayMs = 24 * 60 * 60 * 1000;
    const withinDay = now - record.lastShownAt < dayMs;
    if (!withinDay) return true;
    return record.count < Math.max(1, frequency.maxImpressions);
  }

  // custom
  const record = readRecord(key);
  if (!record) return true;
  const cooldownMs = Math.max(0, frequency.cooldownHours) * 60 * 60 * 1000;
  if (now - record.lastShownAt >= cooldownMs) return true;
  return record.count < Math.max(1, frequency.maxImpressions);
}

function recordImpression(frequency: PopupFrequency, now: number) {
  const key = frequency.storageKey.trim();
  if (!key) return;

  if (frequency.mode === "session") {
    writeSessionCount(key, readSessionCount(key) + 1);
    return;
  }

  if (frequency.mode === "always") return;

  const existing = readRecord(key) ?? { count: 0, lastShownAt: now };
  const dayMs = 24 * 60 * 60 * 1000;
  const resetCount =
    frequency.mode === "daily" && now - existing.lastShownAt >= dayMs;

  writeRecord(key, {
    count: resetCount ? 1 : existing.count + 1,
    lastShownAt: now,
  });
}

type Options = {
  frequency: PopupFrequency;
  dismissKey?: string;
  enabled?: boolean;
};

export function usePopupFrequency({ frequency, dismissKey = "", enabled = true }: Options) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setAllowed(false);
      return;
    }

    const now = Date.now();
    if (dismissKey && isDismissed(dismissKey)) {
      setAllowed(false);
      return;
    }

    setAllowed(canShowByFrequency(frequency, now));
  }, [enabled, frequency, dismissKey]);

  const recordShow = useCallback(() => {
    recordImpression(frequency, Date.now());
  }, [frequency]);

  const dismiss = useCallback(() => {
    if (dismissKey) markPopupDismissed(dismissKey);
    setAllowed(false);
  }, [dismissKey]);

  return { allowed, recordShow, dismiss };
}
