/**
 * Cursor effects — ported from sample Astro (8 types).
 */

const CURSOR_PRIMARY = "var(--cursor-effect-primary, var(--color-primary, var(--primary)))";
const CURSOR_ACCENT = "var(--cursor-effect-accent, var(--color-accent, var(--accent)))";
const CURSOR_OPACITY = "var(--cursor-effect-opacity, 1)";
const CURSOR_INTENSITY = "var(--cursor-effect-intensity, 1)";

function cursorSpeedMul(): number {
  if (typeof document === "undefined") return 1;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--cursor-effect-speed")
    .trim();
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? Math.max(n, 0.25) : 1;
}

function scaledPx(base: number): string {
  return `calc(${base}px * ${CURSOR_INTENSITY})`;
}

let cleanup: (() => void) | null = null;
const cleanups: Array<() => void> = [];

function removePrev() {
  document.querySelectorAll("[data-cur]").forEach((e) => e.remove());
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
}

function el(tag: string, id: string, css: string): HTMLElement {
  const node = document.createElement(tag);
  node.dataset.cur = id;
  node.style.cssText = css;
  return node;
}

function trackCleanup(fn: () => void) {
  cleanups.push(fn);
}

function positionCursor(el: HTMLElement, x: number, y: number, extraTransform = "") {
  el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)${extraTransform}`;
}

function createIdleRafLoop(
  tick: () => void,
  getLastMove: () => number,
  idleMs = 100,
): number {
  let rafId = 0;
  const loop = () => {
    if (performance.now() - getLastMove() < idleMs) {
      tick();
    }
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
  return rafId;
}

export function initCursor(type: string) {
  removePrev();
  if (!type || type === "default" || type === "none") {
    document.body.style.cursor = "auto";
    return;
  }
  document.body.style.cursor = "none";

  switch (type) {
    case "neon-dot":
      return cursorNeonDot();
    case "crosshair":
      return cursorCrosshair();
    case "ring-trail":
      return cursorRingTrail();
    case "spotlight":
      return cursorSpotlight();
    case "magnetic":
      return cursorMagnetic();
    case "blob":
      return cursorBlob();
    case "pixel":
      return cursorPixel();
    case "neon-arrow":
      return cursorNeonArrow();
    default:
      return cursorNeonDot();
  }
}

function cursorNeonDot() {
  const dot = el(
    "div",
    "dot",
    `position:fixed;top:0;left:0;width:${scaledPx(10)};height:${scaledPx(10)};border-radius:50%;pointer-events:none;z-index:9999;will-change:transform;opacity:${CURSOR_OPACITY};background:${CURSOR_PRIMARY};box-shadow:0 0 10px ${CURSOR_PRIMARY},0 0 20px ${CURSOR_PRIMARY};transition:transform .2s`,
  );
  const ring = el(
    "div",
    "ring",
    `position:fixed;top:0;left:0;width:${scaledPx(34)};height:${scaledPx(34)};border-radius:50%;pointer-events:none;z-index:9998;will-change:transform;opacity:${CURSOR_OPACITY};border:1px solid color-mix(in srgb,${CURSOR_PRIMARY} 50%,transparent)`,
  );
  document.body.append(dot, ring);

  let rx = 0;
  let ry = 0;
  let lastMove = performance.now();
  let dotScale = 1;
  const move = (e: MouseEvent) => {
    lastMove = performance.now();
    positionCursor(dot, e.clientX, e.clientY, ` scale(${dotScale})`);
    const lerp = 0.15 * cursorSpeedMul();
    rx += (e.clientX - rx) * lerp;
    ry += (e.clientY - ry) * lerp;
    positionCursor(ring, rx, ry);
  };
  let rafId = createIdleRafLoop(
    () => positionCursor(ring, rx, ry),
    () => lastMove,
  );

  const enter = () => {
    dotScale = 1.8;
  };
  const leave = () => {
    dotScale = 1;
  };
  document.addEventListener("mousemove", move);
  const linkTargets: Array<[Element, () => void, () => void]> = [];
  document.querySelectorAll("a,button").forEach((target) => {
    target.addEventListener("mouseenter", enter);
    target.addEventListener("mouseleave", leave);
    linkTargets.push([target, enter, leave]);
  });
  cleanup = () => {
    document.removeEventListener("mousemove", move);
    cancelAnimationFrame(rafId);
    linkTargets.forEach(([target, onEnter, onLeave]) => {
      target.removeEventListener("mouseenter", onEnter);
      target.removeEventListener("mouseleave", onLeave);
    });
  };
}

function cursorCrosshair() {
  const h = el(
    "div",
    "ch-h",
    `position:fixed;width:${scaledPx(30)};height:1px;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);opacity:${CURSOR_OPACITY};background:${CURSOR_PRIMARY};box-shadow:0 0 6px ${CURSOR_PRIMARY};top:0;left:0`,
  );
  const v = el(
    "div",
    "ch-v",
    `position:fixed;width:1px;height:${scaledPx(30)};pointer-events:none;z-index:9999;transform:translate(-50%,-50%);opacity:${CURSOR_OPACITY};background:${CURSOR_PRIMARY};box-shadow:0 0 6px ${CURSOR_PRIMARY};top:0;left:0`,
  );
  const d = el(
    "div",
    "ch-d",
    `position:fixed;width:${scaledPx(4)};height:${scaledPx(4)};border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);opacity:${CURSOR_OPACITY};background:${CURSOR_ACCENT};top:0;left:0`,
  );
  document.body.append(h, v, d);
  const move = (e: MouseEvent) => {
    [h, v, d].forEach((node) => {
      positionCursor(node, e.clientX, e.clientY);
    });
  };
  document.addEventListener("mousemove", move);
  cleanup = () => document.removeEventListener("mousemove", move);
}

function cursorRingTrail() {
  const rings = Array.from({ length: 5 }, (_, i) => {
    const s = (8 + i * 8) * 1;
    return el(
      "div",
      `rt-${i}`,
      `position:fixed;width:calc(${s}px * ${CURSOR_INTENSITY});height:calc(${s}px * ${CURSOR_INTENSITY});border-radius:50%;pointer-events:none;z-index:${9999 - i};transform:translate(-50%,-50%);opacity:${CURSOR_OPACITY};border:1px solid color-mix(in srgb,${CURSOR_PRIMARY} ${60 - i * 10}%,transparent);top:0;left:0`,
    );
  });
  document.body.append(...rings);
  const pos = rings.map(() => ({ x: 0, y: 0 }));
  let mx = 0;
  let my = 0;
  let lastMove = performance.now();
  const onMove = (e: MouseEvent) => {
    mx = e.clientX;
    my = e.clientY;
    lastMove = performance.now();
  };
  document.addEventListener("mousemove", onMove);
  let rafId = createIdleRafLoop(
    () => {
      const speed = cursorSpeedMul();
      rings.forEach((r, i) => {
        const prev = i === 0 ? { x: mx, y: my } : pos[i - 1];
        const lerp = (0.3 - i * 0.04) * speed;
        pos[i].x += (prev.x - pos[i].x) * lerp;
        pos[i].y += (prev.y - pos[i].y) * lerp;
        positionCursor(r, pos[i].x, pos[i].y);
      });
    },
    () => lastMove,
  );
  cleanup = () => {
    document.removeEventListener("mousemove", onMove);
    cancelAnimationFrame(rafId);
  };
}

function cursorSpotlight() {
  const spot = el(
    "div",
    "spotlight",
    `position:fixed;top:0;left:0;width:calc(280px * ${CURSOR_INTENSITY});height:calc(280px * ${CURSOR_INTENSITY});border-radius:50%;pointer-events:none;z-index:0;will-change:transform;opacity:${CURSOR_OPACITY};background:radial-gradient(circle,color-mix(in srgb,${CURSOR_PRIMARY} 8%,transparent) 0%,transparent 70%);transition:transform calc(.3s / ${cursorSpeedMul()}) ease`,
  );
  const dot = el(
    "div",
    "sp-dot",
    `position:fixed;width:${scaledPx(6)};height:${scaledPx(6)};border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);opacity:${CURSOR_OPACITY};background:${CURSOR_PRIMARY};top:0;left:0`,
  );
  document.body.append(spot, dot);
  const move = (e: MouseEvent) => {
    positionCursor(dot, e.clientX, e.clientY);
    positionCursor(spot, e.clientX, e.clientY);
  };
  document.addEventListener("mousemove", move);
  cleanup = () => document.removeEventListener("mousemove", move);
}

function cursorMagnetic() {
  const dot = el(
    "div",
    "mag",
    `position:fixed;top:0;left:0;width:${scaledPx(12)};height:${scaledPx(12)};border-radius:50%;pointer-events:none;z-index:9999;will-change:transform;opacity:${CURSOR_OPACITY};background:${CURSOR_PRIMARY};box-shadow:0 0 15px ${CURSOR_PRIMARY};mix-blend-mode:difference;transition:transform calc(.3s / ${cursorSpeedMul()}),border-radius calc(.3s / ${cursorSpeedMul()})`,
  );
  document.body.append(dot);
  let mx = 0;
  let my = 0;
  let lastMove = performance.now();
  const onMove = (e: MouseEvent) => {
    mx = e.clientX;
    my = e.clientY;
    lastMove = performance.now();
  };
  document.addEventListener("mousemove", onMove);
  let rafId = createIdleRafLoop(
    () => positionCursor(dot, mx, my),
    () => lastMove,
  );
  document.querySelectorAll<HTMLElement>("a,button").forEach((target) => {
    const enter = () => {
      const r = target.getBoundingClientRect();
      const scaleX = (r.width + 10) / 12;
      const scaleY = (r.height + 10) / 12;
      dot.style.borderRadius = "4px";
      positionCursor(
        dot,
        r.left + r.width / 2,
        r.top + r.height / 2,
        ` scale(${scaleX}, ${scaleY})`,
      );
    };
    const leave = () => {
      dot.style.borderRadius = "50%";
      positionCursor(dot, mx, my);
    };
    target.addEventListener("mouseenter", enter);
    target.addEventListener("mouseleave", leave);
    trackCleanup(() => {
      target.removeEventListener("mouseenter", enter);
      target.removeEventListener("mouseleave", leave);
    });
  });
  cleanup = () => {
    document.removeEventListener("mousemove", onMove);
    cancelAnimationFrame(rafId);
  };
}

function cursorBlob() {
  const blob = el(
    "div",
    "blob",
    `position:fixed;width:${scaledPx(50)};height:${scaledPx(50)};border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);opacity:${CURSOR_OPACITY};background:color-mix(in srgb,${CURSOR_PRIMARY} 25%,transparent);backdrop-filter:blur(4px);top:0;left:0;transition:border-radius calc(.4s / ${cursorSpeedMul()})`,
  );
  document.body.append(blob);
  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;
  let lastMove = performance.now();
  const onMove = (e: MouseEvent) => {
    tx = e.clientX;
    ty = e.clientY;
    lastMove = performance.now();
  };
  document.addEventListener("mousemove", onMove);
  let rafId = createIdleRafLoop(
    () => {
      const lerp = 0.1 * cursorSpeedMul();
      cx += (tx - cx) * lerp;
      cy += (ty - cy) * lerp;
      const dx = tx - cx;
      const dy = ty - cy;
      const d = Math.hypot(dx, dy);
      const a = (Math.atan2(dy, dx) * 180) / Math.PI;
      const s = Math.min(d * 0.3, 25);
      blob.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%,-50%) rotate(${a}deg) scaleX(${1 + s / 50}) scaleY(${1 - s / 100})`;
    },
    () => lastMove,
  );
  document.querySelectorAll("a,button").forEach((e) => {
    const enter = () => {
      blob.style.borderRadius = "30% 70% 70% 30%/30% 30% 70% 70%";
    };
    const leave = () => {
      blob.style.borderRadius = "50%";
    };
    e.addEventListener("mouseenter", enter);
    e.addEventListener("mouseleave", leave);
    trackCleanup(() => {
      e.removeEventListener("mouseenter", enter);
      e.removeEventListener("mouseleave", leave);
    });
  });
  cleanup = () => {
    document.removeEventListener("mousemove", onMove);
    cancelAnimationFrame(rafId);
  };
}

function cursorPixel() {
  const px = el(
    "div",
    "pixel",
    `position:fixed;width:${scaledPx(16)};height:${scaledPx(16)};pointer-events:none;z-index:9999;image-rendering:pixelated;opacity:${CURSOR_OPACITY};background:${CURSOR_PRIMARY};clip-path:polygon(0 0,75% 0,100% 25%,100% 75%,75% 100%,0 100%);top:0;left:0`,
  );
  document.body.append(px);
  const move = (e: MouseEvent) => {
    positionCursor(px, e.clientX, e.clientY);
  };
  document.addEventListener("mousemove", move);
  cleanup = () => document.removeEventListener("mousemove", move);
}

function cursorNeonArrow() {
  const arrow = el(
    "div",
    "n-arrow",
    `position:fixed;width:0;height:0;pointer-events:none;z-index:9999;opacity:${CURSOR_OPACITY};border-left:calc(14px * ${CURSOR_INTENSITY}) solid ${CURSOR_PRIMARY};border-top:calc(8px * ${CURSOR_INTENSITY}) solid transparent;border-bottom:calc(8px * ${CURSOR_INTENSITY}) solid transparent;filter:drop-shadow(0 0 6px ${CURSOR_PRIMARY});transform-origin:4px 8px;top:0;left:0`,
  );
  document.body.append(arrow);
  let lx = 0;
  let ly = 0;
  const move = (e: MouseEvent) => {
    const a = (Math.atan2(e.clientY - ly, e.clientX - lx) * 180) / Math.PI;
    arrow.style.transform = `translate3d(${e.clientX}px, ${e.clientY - 8}px, 0) rotate(${a}deg)`;
    lx = e.clientX;
    ly = e.clientY;
  };
  document.addEventListener("mousemove", move);
  cleanup = () => document.removeEventListener("mousemove", move);
}
