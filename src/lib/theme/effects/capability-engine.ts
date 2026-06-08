import type { CapabilityPolicy, DeviceCapabilities } from "./types";

type CapabilityListener = (capabilities: DeviceCapabilities, policy: CapabilityPolicy) => void;

let cachedCapabilities: DeviceCapabilities | null = null;
let cachedPolicy: CapabilityPolicy | null = null;
const listeners = new Set<CapabilityListener>();
let mediaQueries: MediaQueryList[] = [];
let resizeListener: (() => void) | null = null;

function readDeviceMemory(): number | null {
  if (typeof navigator === "undefined") return null;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof memory === "number" ? memory : null;
}

function readConnectionType(): string | null {
  if (typeof navigator === "undefined") return null;
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  return conn?.effectiveType ?? null;
}

/** Detect runtime device / environment capabilities (client-only). */
export function detectDeviceCapabilities(): DeviceCapabilities {
  if (typeof window === "undefined") {
    return {
      prefersReducedMotion: false,
      lowEndDevice: false,
      touchOnly: false,
      smallScreen: false,
      hardwareConcurrency: 8,
      deviceMemoryGb: null,
      effectiveConnection: null,
    };
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touchOnly = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const smallScreen = window.innerWidth < 768;
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const deviceMemoryGb = readDeviceMemory();
  const effectiveConnection = readConnectionType();

  const slowConnection =
    effectiveConnection === "slow-2g" || effectiveConnection === "2g" || effectiveConnection === "3g";
  const lowMemory = deviceMemoryGb != null && deviceMemoryGb <= 4;
  const lowCores = hardwareConcurrency <= 4;
  const lowEndDevice = lowCores || lowMemory || slowConnection;

  return {
    prefersReducedMotion,
    lowEndDevice,
    touchOnly,
    smallScreen,
    hardwareConcurrency,
    deviceMemoryGb,
    effectiveConnection,
  };
}

/** Derive what effect tiers are allowed for the current environment. */
export function buildCapabilityPolicy(capabilities: DeviceCapabilities): CapabilityPolicy {
  const { prefersReducedMotion, lowEndDevice, touchOnly, smallScreen } = capabilities;
  const constrained = prefersReducedMotion || lowEndDevice || smallScreen || touchOnly;

  return {
    allowHeavy: !prefersReducedMotion && !lowEndDevice && !smallScreen && !touchOnly,
    allowMedium: !prefersReducedMotion && !lowEndDevice && !smallScreen,
    allowCustomCursor: !touchOnly && !lowEndDevice && !smallScreen,
    allowAnimatedBackground: !constrained,
    allowTextAnimation: !prefersReducedMotion && !smallScreen,
    allowMotion: !prefersReducedMotion && !lowEndDevice,
    allowStagger: !prefersReducedMotion && !smallScreen && !touchOnly,
  };
}

/** Reflect capability tier on <html> for CSS paint reduction. */
export function applyCapabilityAttributes(
  capabilities: DeviceCapabilities,
  policy: CapabilityPolicy,
): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const tier = policy.allowHeavy ? "full" : policy.allowMedium ? "medium" : "light";
  root.dataset.effectsTier = tier;
  root.dataset.reducedPaint = String(!policy.allowHeavy);
  root.dataset.touchOnly = String(capabilities.touchOnly);
  root.dataset.lowEndDevice = String(capabilities.lowEndDevice);
}

export function getCapabilities(): { capabilities: DeviceCapabilities; policy: CapabilityPolicy } {
  if (!cachedCapabilities || !cachedPolicy) {
    const capabilities = detectDeviceCapabilities();
    cachedCapabilities = capabilities;
    cachedPolicy = buildCapabilityPolicy(capabilities);
  }
  return { capabilities: cachedCapabilities, policy: cachedPolicy };
}

export function refreshCapabilities(): { capabilities: DeviceCapabilities; policy: CapabilityPolicy } {
  const capabilities = detectDeviceCapabilities();
  cachedCapabilities = capabilities;
  cachedPolicy = buildCapabilityPolicy(capabilities);
  applyCapabilityAttributes(capabilities, cachedPolicy);
  for (const listener of listeners) {
    listener(capabilities, cachedPolicy);
  }
  return { capabilities, policy: cachedPolicy };
}

function onMediaChange() {
  refreshCapabilities();
}

/** Subscribe to capability changes (resize, motion preference, pointer type). */
export function subscribeCapabilityChanges(listener: CapabilityListener): () => void {
  if (typeof window === "undefined") return () => {};

  listeners.add(listener);

  if (listeners.size === 1) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(hover: none) and (pointer: coarse)");
    reduced.addEventListener("change", onMediaChange);
    coarse.addEventListener("change", onMediaChange);
    mediaQueries = [reduced, coarse];
    resizeListener = onMediaChange;
    window.addEventListener("resize", resizeListener);
  }

  const current = getCapabilities();
  listener(current.capabilities, current.policy);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      for (const mq of mediaQueries) {
        mq.removeEventListener("change", onMediaChange);
      }
      mediaQueries = [];
      if (resizeListener) {
        window.removeEventListener("resize", resizeListener);
        resizeListener = null;
      }
    }
  };
}
