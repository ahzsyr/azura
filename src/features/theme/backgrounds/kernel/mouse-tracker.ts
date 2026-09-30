import type { MouseTrackerState } from "../types";

let state: MouseTrackerState = { x: 0, y: 0, active: false };
let refCount = 0;
let bound = false;

function onPointerMove(e: PointerEvent) {
  state = { x: e.clientX, y: e.clientY, active: true };
}

function onPointerLeave() {
  state = { ...state, active: false };
}

export function acquireMouseTracker(): MouseTrackerState {
  if (typeof window === "undefined") return state;
  refCount += 1;
  if (!bound) {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });
    bound = true;
  }
  return state;
}

export function releaseMouseTracker(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && bound && typeof window !== "undefined") {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerleave", onPointerLeave);
    bound = false;
    state = { x: 0, y: 0, active: false };
  }
}

export function getMouseState(): MouseTrackerState {
  return state;
}
