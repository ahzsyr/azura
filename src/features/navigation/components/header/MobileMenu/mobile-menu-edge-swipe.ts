"use client";

/**
 * Swipe in from the screen edge the drawer lives on to open the mobile menu.
 *
 * Listens on the document with passive touch listeners only. No hit-zone
 * element sits on the edge, so Safari's edge sampling (toolbar and status bar
 * tint) and page scrolling are untouched. If Safari claims the touch for its
 * own history swipe, the page gets touchcancel and the drawer springs back.
 */

/** Start zone measured in from the drawer's edge (inline-end). */
export const EDGE_SWIPE_ZONE_PX = 24;
/** Touches this close to the bottom belong to the Home indicator. */
export const EDGE_SWIPE_BOTTOM_GUARD_PX = 48;
/** Travel used when the drawer does not follow the finger (fade, scale, fullscreen, reduced motion). */
export const EDGE_SWIPE_UNTRACKED_DISTANCE_PX = 120;

const AXIS_LOCK_PX = 10;
const HORIZONTAL_BIAS = 1.2;
const OPEN_RATIO = 0.4;
/** px/ms toward the open position; a flick opens or cancels regardless of travel. */
const FLICK_VELOCITY = 0.35;
/** A finger that rested this long before lifting carries no flick. */
const STALE_VELOCITY_MS = 100;

export type EdgeSwipeOptions = {
  isRtl: () => boolean;
  canStart: () => boolean;
  /** Prepare the drawer. Return the full open travel in px, or 0 to let the touch go. */
  onClaim: () => number;
  onMove: (travel: number) => void;
  onRelease: (open: boolean) => void;
  onCancel: () => void;
};

export function startsInEdgeZone(
  clientX: number,
  viewportWidth: number,
  rtl: boolean,
  zone: number = EDGE_SWIPE_ZONE_PX,
): boolean {
  const fromEdge = rtl ? clientX : viewportWidth - clientX;
  return fromEdge >= 0 && fromEdge <= zone;
}

export function shouldOpenFromEdge(travel: number, distance: number, inwardVelocity: number): boolean {
  if (travel <= 0) return false;
  if (inwardVelocity >= FLICK_VELOCITY) return true;
  if (inwardVelocity <= -FLICK_VELOCITY) return false;
  return travel / Math.max(distance, 1) >= OPEN_RATIO;
}

const EDGE_SWIPE_OPT_OUT = "[data-edge-swipe='ignore'], input, textarea, select, [contenteditable='true']";

/** Carousels and other sideways scrollers keep their own swipe. */
function isInHorizontalScroller(target: EventTarget | null): boolean {
  let el = target instanceof Element ? target : null;
  if (el?.closest(EDGE_SWIPE_OPT_OUT)) return true;
  while (el && el !== document.body && el !== document.documentElement) {
    if (el.scrollWidth > el.clientWidth + 1) {
      const overflowX = getComputedStyle(el).overflowX;
      if (overflowX === "auto" || overflowX === "scroll") return true;
    }
    el = el.parentElement;
  }
  return false;
}

export function attachEdgeSwipe(options: EdgeSwipeOptions): () => void {
  let phase: "idle" | "pending" | "tracking" = "idle";
  let touchId = -1;
  let rtl = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;
  let distance = 0;
  let travel = 0;

  const reset = () => {
    phase = "idle";
    touchId = -1;
  };

  const cancelTracking = () => {
    const wasTracking = phase === "tracking";
    reset();
    if (wasTracking) options.onCancel();
  };

  const findTouch = (list: TouchList): Touch | null => {
    for (let i = 0; i < list.length; i += 1) {
      if (list[i].identifier === touchId) return list[i];
    }
    return null;
  };

  const onStart = (event: TouchEvent) => {
    if (phase !== "idle") {
      if (event.touches.length > 1) cancelTracking();
      return;
    }
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    rtl = options.isRtl();
    if (!startsInEdgeZone(touch.clientX, window.innerWidth, rtl)) return;
    if (touch.clientY > window.innerHeight - EDGE_SWIPE_BOTTOM_GUARD_PX) return;
    if (!options.canStart() || isInHorizontalScroller(event.target)) return;
    phase = "pending";
    touchId = touch.identifier;
    startX = lastX = touch.clientX;
    startY = touch.clientY;
    lastT = event.timeStamp;
    velocity = 0;
    travel = 0;
  };

  const onMove = (event: TouchEvent) => {
    if (phase === "idle") return;
    const touch = findTouch(event.touches);
    if (!touch) return;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    const inward = rtl ? dx : -dx;

    if (phase === "pending") {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      if (inward <= 0 || Math.abs(dx) < Math.abs(dy) * HORIZONTAL_BIAS) {
        reset();
        return;
      }
      distance = options.onClaim();
      if (distance <= 0) {
        reset();
        return;
      }
      phase = "tracking";
    }

    const dt = event.timeStamp - lastT;
    if (dt > 0) {
      const step = rtl ? touch.clientX - lastX : lastX - touch.clientX;
      velocity = velocity * 0.3 + (step / dt) * 0.7;
    }
    lastX = touch.clientX;
    lastT = event.timeStamp;
    travel = Math.min(distance, Math.max(0, inward));
    options.onMove(travel);
  };

  const onEnd = (event: TouchEvent) => {
    if (phase === "idle" || findTouch(event.touches)) return;
    const wasTracking = phase === "tracking";
    reset();
    if (!wasTracking) return;
    const flick = event.timeStamp - lastT > STALE_VELOCITY_MS ? 0 : velocity;
    options.onRelease(shouldOpenFromEdge(travel, distance, flick));
  };

  const listen = { passive: true } as const;
  document.addEventListener("touchstart", onStart, listen);
  document.addEventListener("touchmove", onMove, listen);
  document.addEventListener("touchend", onEnd, listen);
  document.addEventListener("touchcancel", cancelTracking, listen);
  return () => {
    document.removeEventListener("touchstart", onStart);
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", onEnd);
    document.removeEventListener("touchcancel", cancelTracking);
    cancelTracking();
  };
}
