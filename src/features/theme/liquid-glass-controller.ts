/**
 * Pointer-driven Liquid Glass specular tracking.
 * Streams --pointer-x / --pointer-y / --specular-angle onto <html> via rAF lerp.
 * No WebGL; gyro permission UX intentionally omitted (v1).
 * Coarse/touch pointers keep static defaults (no continuous rAF).
 */

type LiquidGlassControllerOptions = {
  lerp?: number;
};

let activeController: LiquidGlassController | null = null;
let pauseDepth = 0;
let wantEnabled = false;

function isTransitionPaused(): boolean {
  return pauseDepth > 0;
}

export class LiquidGlassController {
  private targetX = 50;
  private targetY = 50;
  private currentX = 50;
  private currentY = 50;
  private lerp: number;
  private rafId = 0;
  private running = false;
  private onPointerMove: (e: PointerEvent) => void;
  private onVisibility: () => void;

  constructor(options: LiquidGlassControllerOptions = {}) {
    this.lerp = options.lerp ?? 0.12;
    this.onPointerMove = (e: PointerEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      this.targetX = (e.clientX / w) * 100;
      this.targetY = (e.clientY / h) * 100;
    };
    this.onVisibility = () => {
      if (document.hidden || isTransitionPaused()) this.pause();
      else if (this.running) this.schedule();
    };
  }

  start(): void {
    if (typeof window === "undefined") return;
    if (this.prefersReducedMotion()) return;
    if (this.isCoarsePointer()) {
      // Touch / coarse: leave CSS defaults; do not spin rAF.
      this.running = false;
      return;
    }
    if (this.running) return;
    this.running = true;
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", this.onVisibility);
    if (!isTransitionPaused() && !document.hidden) this.schedule();
  }

  stop(): void {
    this.running = false;
    this.pause();
    if (typeof window === "undefined") return;
    window.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.clearVars();
  }

  /** Pause rAF without clearing pointer vars (used during route transitions). */
  softPause(): void {
    this.pause();
  }

  softResume(): void {
    if (this.running && !document.hidden && !isTransitionPaused()) this.schedule();
  }

  private prefersReducedMotion(): boolean {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  }

  private isCoarsePointer(): boolean {
    try {
      return window.matchMedia("(pointer: coarse)").matches;
    } catch {
      return false;
    }
  }

  private pause(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private schedule(): void {
    if (!this.running || document.hidden || isTransitionPaused()) return;
    this.pause();
    this.rafId = requestAnimationFrame(() => this.tick());
  }

  private tick(): void {
    this.rafId = 0;
    if (!this.running || document.hidden || isTransitionPaused()) return;

    this.currentX += (this.targetX - this.currentX) * this.lerp;
    this.currentY += (this.targetY - this.currentY) * this.lerp;

    const angle =
      Math.atan2(this.currentY - 50, this.currentX - 50) * (180 / Math.PI) + 90;

    const root = document.documentElement;
    root.style.setProperty("--pointer-x", this.currentX.toFixed(2));
    root.style.setProperty("--pointer-y", this.currentY.toFixed(2));
    root.style.setProperty("--specular-angle", `${angle.toFixed(2)}deg`);

    this.schedule();
  }

  private clearVars(): void {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.style.removeProperty("--pointer-x");
    root.style.removeProperty("--pointer-y");
    root.style.removeProperty("--specular-angle");
  }
}

function setGlassTransitionCheap(cheap: boolean): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (cheap) html.dataset.glassTransition = "cheap";
  else delete html.dataset.glassTransition;
}

/** Start global controller when Liquid Glass is enabled; idempotent. */
export function startLiquidGlassController(): void {
  if (typeof window === "undefined") return;
  if (document.documentElement.dataset.reducedPaint === "true") return;
  try {
    if (window.matchMedia("(prefers-reduced-transparency: reduce)").matches) return;
  } catch {
    /* ignore */
  }
  wantEnabled = true;
  if (isTransitionPaused()) return;
  if (!activeController) {
    activeController = new LiquidGlassController();
  }
  activeController.start();
}

/** Stop and clear CSS vars. */
export function stopLiquidGlassController(): void {
  wantEnabled = false;
  pauseDepth = 0;
  activeController?.stop();
  activeController = null;
  setGlassTransitionCheap(false);
}

export function syncLiquidGlassController(enabled: boolean): void {
  if (enabled) startLiquidGlassController();
  else stopLiquidGlassController();
}

/**
 * Pause specular tracking + cheap blur during page transitions / preloader.
 * Nested-safe via pause depth; pair each pause with resumeLiquidGlassAfterTransition.
 */
export function pauseLiquidGlassForTransition(): void {
  if (typeof document === "undefined") return;
  pauseDepth += 1;
  setGlassTransitionCheap(true);
  activeController?.softPause();
}

/** Resume after route settle when glass is still enabled. */
export function resumeLiquidGlassAfterTransition(): void {
  if (typeof document === "undefined") return;
  pauseDepth = Math.max(0, pauseDepth - 1);
  if (pauseDepth > 0) return;
  setGlassTransitionCheap(false);
  if (wantEnabled) {
    if (!activeController) {
      startLiquidGlassController();
    } else {
      activeController.softResume();
    }
  }
}
