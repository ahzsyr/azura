/**
 * Cursor effects — ported from sample Astro (8 types).
 */

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
    `position:fixed;width:10px;height:10px;border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);background:var(--color-primary,var(--primary));box-shadow:0 0 10px var(--color-primary,var(--primary)),0 0 20px var(--color-primary,var(--primary));transition:width .2s,height .2s;top:0;left:0`,
  );
  const ring = el(
    "div",
    "ring",
    `position:fixed;width:34px;height:34px;border-radius:50%;pointer-events:none;z-index:9998;transform:translate(-50%,-50%);border:1px solid color-mix(in srgb,var(--color-primary,var(--primary)) 50%,transparent);top:0;left:0`,
  );
  document.body.append(dot, ring);

  let rx = 0;
  let ry = 0;
  const move = (e: MouseEvent) => {
    dot.style.left = `${e.clientX}px`;
    dot.style.top = `${e.clientY}px`;
    rx += (e.clientX - rx) * 0.15;
    ry += (e.clientY - ry) * 0.15;
    ring.style.left = `${rx}px`;
    ring.style.top = `${ry}px`;
  };
  let rafId = 0;
  const raf = () => {
    ring.style.left = `${rx}px`;
    ring.style.top = `${ry}px`;
    rafId = requestAnimationFrame(raf);
  };
  rafId = requestAnimationFrame(raf);

  const enter = () => {
    dot.style.width = "18px";
    dot.style.height = "18px";
  };
  const leave = () => {
    dot.style.width = "10px";
    dot.style.height = "10px";
  };
  document.addEventListener("mousemove", move);
  document.querySelectorAll("a,button").forEach((e) => {
    e.addEventListener("mouseenter", enter);
    e.addEventListener("mouseleave", leave);
  });
  cleanup = () => {
    document.removeEventListener("mousemove", move);
    cancelAnimationFrame(rafId);
  };
}

function cursorCrosshair() {
  const h = el(
    "div",
    "ch-h",
    `position:fixed;width:30px;height:1px;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);background:var(--color-primary,var(--primary));box-shadow:0 0 6px var(--color-primary,var(--primary));top:0;left:0`,
  );
  const v = el(
    "div",
    "ch-v",
    `position:fixed;width:1px;height:30px;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);background:var(--color-primary,var(--primary));box-shadow:0 0 6px var(--color-primary,var(--primary));top:0;left:0`,
  );
  const d = el(
    "div",
    "ch-d",
    `position:fixed;width:4px;height:4px;border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);background:var(--color-accent,var(--accent));top:0;left:0`,
  );
  document.body.append(h, v, d);
  const move = (e: MouseEvent) => {
    [h, v, d].forEach((node) => {
      node.style.left = `${e.clientX}px`;
      node.style.top = `${e.clientY}px`;
    });
  };
  document.addEventListener("mousemove", move);
  cleanup = () => document.removeEventListener("mousemove", move);
}

function cursorRingTrail() {
  const rings = Array.from({ length: 5 }, (_, i) => {
    const s = 8 + i * 8;
    return el(
      "div",
      `rt-${i}`,
      `position:fixed;width:${s}px;height:${s}px;border-radius:50%;pointer-events:none;z-index:${9999 - i};transform:translate(-50%,-50%);border:1px solid color-mix(in srgb,var(--color-primary,var(--primary)) ${60 - i * 10}%,transparent);top:0;left:0`,
    );
  });
  document.body.append(...rings);
  const pos = rings.map(() => ({ x: 0, y: 0 }));
  let mx = 0;
  let my = 0;
  const onMove = (e: MouseEvent) => {
    mx = e.clientX;
    my = e.clientY;
  };
  document.addEventListener("mousemove", onMove);
  let rafId = 0;
  const raf = () => {
    rings.forEach((r, i) => {
      const prev = i === 0 ? { x: mx, y: my } : pos[i - 1];
      pos[i].x += (prev.x - pos[i].x) * (0.3 - i * 0.04);
      pos[i].y += (prev.y - pos[i].y) * (0.3 - i * 0.04);
      r.style.left = `${pos[i].x}px`;
      r.style.top = `${pos[i].y}px`;
    });
    rafId = requestAnimationFrame(raf);
  };
  rafId = requestAnimationFrame(raf);
  cleanup = () => {
    document.removeEventListener("mousemove", onMove);
    cancelAnimationFrame(rafId);
  };
}

function cursorSpotlight() {
  const spot = el(
    "div",
    "spotlight",
    `position:fixed;width:280px;height:280px;border-radius:50%;pointer-events:none;z-index:0;transform:translate(-50%,-50%);background:radial-gradient(circle,color-mix(in srgb,var(--color-primary,var(--primary)) 8%,transparent) 0%,transparent 70%);top:0;left:0;transition:left .3s ease,top .3s ease`,
  );
  const dot = el(
    "div",
    "sp-dot",
    `position:fixed;width:6px;height:6px;border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);background:var(--color-primary,var(--primary));top:0;left:0`,
  );
  document.body.append(spot, dot);
  const move = (e: MouseEvent) => {
    dot.style.left = `${e.clientX}px`;
    dot.style.top = `${e.clientY}px`;
    spot.style.left = `${e.clientX}px`;
    spot.style.top = `${e.clientY}px`;
  };
  document.addEventListener("mousemove", move);
  cleanup = () => document.removeEventListener("mousemove", move);
}

function cursorMagnetic() {
  const dot = el(
    "div",
    "mag",
    `position:fixed;width:12px;height:12px;border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);background:var(--color-primary,var(--primary));box-shadow:0 0 15px var(--color-primary,var(--primary));mix-blend-mode:difference;top:0;left:0;transition:width .3s,height .3s,border-radius .3s`,
  );
  document.body.append(dot);
  let mx = 0;
  let my = 0;
  const onMove = (e: MouseEvent) => {
    mx = e.clientX;
    my = e.clientY;
  };
  document.addEventListener("mousemove", onMove);
  let rafId = 0;
  const raf = () => {
    dot.style.left = `${mx}px`;
    dot.style.top = `${my}px`;
    rafId = requestAnimationFrame(raf);
  };
  rafId = requestAnimationFrame(raf);
  document.querySelectorAll<HTMLElement>("a,button").forEach((target) => {
    const enter = () => {
      const r = target.getBoundingClientRect();
      dot.style.width = `${r.width + 10}px`;
      dot.style.height = `${r.height + 10}px`;
      dot.style.borderRadius = "4px";
      dot.style.left = `${r.left + r.width / 2}px`;
      dot.style.top = `${r.top + r.height / 2}px`;
    };
    const leave = () => {
      dot.style.width = "12px";
      dot.style.height = "12px";
      dot.style.borderRadius = "50%";
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
    `position:fixed;width:50px;height:50px;border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);background:color-mix(in srgb,var(--color-primary,var(--primary)) 25%,transparent);backdrop-filter:blur(4px);top:0;left:0;transition:border-radius .4s`,
  );
  document.body.append(blob);
  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;
  const onMove = (e: MouseEvent) => {
    tx = e.clientX;
    ty = e.clientY;
  };
  document.addEventListener("mousemove", onMove);
  let rafId = 0;
  const raf = () => {
    cx += (tx - cx) * 0.1;
    cy += (ty - cy) * 0.1;
    blob.style.left = `${cx}px`;
    blob.style.top = `${cy}px`;
    const dx = tx - cx;
    const dy = ty - cy;
    const d = Math.hypot(dx, dy);
    const a = (Math.atan2(dy, dx) * 180) / Math.PI;
    const s = Math.min(d * 0.3, 25);
    blob.style.transform = `translate(-50%,-50%) rotate(${a}deg) scaleX(${1 + s / 50}) scaleY(${1 - s / 100})`;
    rafId = requestAnimationFrame(raf);
  };
  rafId = requestAnimationFrame(raf);
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
    `position:fixed;width:16px;height:16px;pointer-events:none;z-index:9999;image-rendering:pixelated;background:var(--color-primary,var(--primary));clip-path:polygon(0 0,75% 0,100% 25%,100% 75%,75% 100%,0 100%);top:0;left:0`,
  );
  document.body.append(px);
  const move = (e: MouseEvent) => {
    px.style.left = `${e.clientX}px`;
    px.style.top = `${e.clientY}px`;
  };
  document.addEventListener("mousemove", move);
  cleanup = () => document.removeEventListener("mousemove", move);
}

function cursorNeonArrow() {
  const arrow = el(
    "div",
    "n-arrow",
    `position:fixed;width:0;height:0;pointer-events:none;z-index:9999;border-left:14px solid var(--color-primary,var(--primary));border-top:8px solid transparent;border-bottom:8px solid transparent;filter:drop-shadow(0 0 6px var(--color-primary,var(--primary)));transform-origin:4px 8px;top:0;left:0`,
  );
  document.body.append(arrow);
  let lx = 0;
  let ly = 0;
  const move = (e: MouseEvent) => {
    const a = (Math.atan2(e.clientY - ly, e.clientX - lx) * 180) / Math.PI;
    arrow.style.left = `${e.clientX}px`;
    arrow.style.top = `${e.clientY - 8}px`;
    arrow.style.transform = `rotate(${a}deg)`;
    lx = e.clientX;
    ly = e.clientY;
  };
  document.addEventListener("mousemove", move);
  cleanup = () => document.removeEventListener("mousemove", move);
}
