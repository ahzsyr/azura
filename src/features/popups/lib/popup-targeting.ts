import type { PopupDeviceTargeting, PopupPageTargeting, PopupSchedule } from "@/features/popups/popup.schema";

export type DeviceType = "desktop" | "tablet" | "mobile";

export function getDeviceType(width: number): DeviceType {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function matchesDeviceTargeting(
  devices: PopupDeviceTargeting,
  device: DeviceType,
): boolean {
  if (device === "desktop") return devices.desktop;
  if (device === "tablet") return devices.tablet;
  return devices.mobile;
}

function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "") || "/";
  return trimmed.toLowerCase();
}

function pathMatchesPattern(pathname: string, pattern: string): boolean {
  const normalizedPath = normalizePath(pathname);
  const normalizedPattern = normalizePath(pattern.trim());
  if (!normalizedPattern) return false;

  if (normalizedPattern.endsWith("*")) {
    const prefix = normalizedPattern.slice(0, -1);
    return normalizedPath.startsWith(prefix);
  }

  return normalizedPath === normalizedPattern;
}

export function matchesPageTargeting(
  targeting: PopupPageTargeting,
  pathname: string,
): boolean {
  if (targeting.mode === "all") return true;

  const paths = targeting.paths.filter(Boolean);
  if (paths.length === 0) {
    return targeting.mode !== "exclude";
  }

  const matched = paths.some((pattern) => pathMatchesPattern(pathname, pattern));

  if (targeting.mode === "include") return matched;
  return !matched;
}

export function isWithinSchedule(schedule: PopupSchedule, now = new Date()): boolean {
  if (!schedule.enabled) return true;

  if (schedule.startAt) {
    const start = new Date(schedule.startAt);
    if (!Number.isNaN(start.getTime()) && now < start) return false;
  }

  if (schedule.endAt) {
    const end = new Date(schedule.endAt);
    if (!Number.isNaN(end.getTime()) && now > end) return false;
  }

  return true;
}
