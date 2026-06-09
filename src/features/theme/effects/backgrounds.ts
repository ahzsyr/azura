/**
 * Background effects — ported from sample Astro (12 types).
 * Layers use [data-bg-effect]; reads --color-primary with --primary fallback.
 */

import {
  getEffectColor,
  getMatrixTrailColor,
  getStarFillColor,
  getThemeColor,
  resolveCssColor,
} from "./color-helper";
import { getTieredParticleCount, runCanvasLoop } from "./canvas-animation-loop";

let loopStop: (() => void) | null = null;
let cleanupFn: (() => void) | null = null;

type BgScope = {
  container: HTMLElement;
  loopStopRef: { current: (() => void) | null };
};

function stopSiteLoop() {
  loopStop?.();
  loopStop = null;
}

function startSiteLoop(draw: () => void) {
  stopSiteLoop();
  loopStop = runCanvasLoop(draw);
}

function startScopedLoop(draw: () => void, scope: BgScope) {
  scope.loopStopRef.current?.();
  scope.loopStopRef.current = runCanvasLoop(draw);
}

function ensureBgKeyframes() {
  if (document.getElementById("devi-bg-keyframes")) return;
  const style = document.createElement("style");
  style.id = "devi-bg-keyframes";
  style.textContent = `
    @keyframes gridScroll { 0% { background-position: 0 0; } 100% { background-position: 60px 60px; } }
    @keyframes auroraMove { 0% { transform: translate(0,0) rotate(0deg); } 100% { transform: translate(5%,3%) rotate(3deg); } }
  `;
  document.head.append(style);
}

export function initBackground(type: string) {
  document.querySelectorAll("[data-bg-effect]").forEach((el) => {
    if (el === document.body || el === document.documentElement) return;
    el.remove();
  });
  document.querySelectorAll("[data-bg-layer]").forEach((el) => el.remove());
  stopSiteLoop();
  if (cleanupFn) {
    cleanupFn();
    cleanupFn = null;
  }
  ensureBgKeyframes();
  runSiteEffect(type);
}

function runSiteEffect(type: string) {
  switch (type) {
    case "grid":
      return initGrid();
    case "particles":
      return initParticles();
    case "waves":
      return initWaves();
    case "stars":
      return initStars();
    case "matrix":
      return initMatrix();
    case "aurora":
      return initAurora();
    case "noise":
      return initNoise();
    case "hexagons":
      return initHexagons();
    case "circuit":
      return initCircuit();
    case "bubbles":
      return initBubbles();
    case "geometric":
      return initGeometric();
    case "vortex":
      return initVortex();
    case "none":
    default:
      return;
  }
}

function mkSiteCanvas(id: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.setAttribute("data-bg-effect", id);
  c.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:0;width:100%;height:100%";
  document.body.prepend(c);
  c.width = window.innerWidth;
  c.height = window.innerHeight;
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  const onResize = () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    }, 16);
  };
  window.addEventListener("resize", onResize);
  cleanupFn = () => {
    window.removeEventListener("resize", onResize);
    if (resizeTimer) {
      clearTimeout(resizeTimer);
      resizeTimer = null;
    }
  };
  return c;
}

function mkScopedCanvas(id: string, scope: BgScope): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.setAttribute("data-section-bg-effect", id);
  c.style.cssText =
    "position:absolute;inset:0;pointer-events:none;z-index:0;width:100%;height:100%;overflow:hidden;";
  scope.container.prepend(c);
  const resize = () => {
    c.width = scope.container.clientWidth;
    c.height = scope.container.clientHeight;
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(scope.container);
  const prevCleanup = scope.loopStopRef.current;
  scope.loopStopRef.current = () => {
    ro.disconnect();
    prevCleanup?.();
  };
  return c;
}

function sectionLayerBase(): string {
  return "position:absolute;inset:0;pointer-events:none;z-index:0;width:100%;height:100%;overflow:hidden;";
}

function mountGridLayer(parent: HTMLElement, attr: "data-bg-effect" | "data-section-bg-effect") {
  const div = document.createElement("div");
  div.setAttribute(attr, "grid");
  if (attr === "data-section-bg-effect") {
    div.className = "az-section-bg-layer az-section-bg-grid";
  }
  const mix = attr === "data-section-bg-effect" ? "5%" : "4%";
  const size = attr === "data-section-bg-effect" ? "48px 48px" : "60px 60px";
  const duration = attr === "data-section-bg-effect" ? "24s" : "20s";
  div.style.cssText = `${attr === "data-bg-effect" ? "position:fixed;inset:0;pointer-events:none;z-index:0;" : sectionLayerBase()}
    background-image:linear-gradient(color-mix(in srgb,var(--color-primary,var(--primary,#047857)) ${mix},transparent) 1px,transparent 1px),
      linear-gradient(90deg,color-mix(in srgb,var(--color-primary,var(--primary,#047857)) ${mix},transparent) 1px,transparent 1px);
    background-size:${size};animation:gridScroll ${duration} linear infinite`;
  parent.prepend(div);
  return div;
}

function mountAuroraLayer(parent: HTMLElement, attr: "data-bg-effect" | "data-section-bg-effect") {
  const div = document.createElement("div");
  div.setAttribute(attr, "aurora");
  const base = attr === "data-bg-effect" ? "position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden" : sectionLayerBase() + "overflow:hidden";
  const blur = attr === "data-bg-effect" ? "40px" : "36px";
  const primaryMix = attr === "data-bg-effect" ? "15%" : "18%";
  const accentMix = attr === "data-bg-effect" ? "10%" : "12%";
  div.style.cssText = base;
  div.innerHTML = `<div style="position:absolute;width:150%;height:150%;top:-25%;left:-25%;
    background:radial-gradient(ellipse 80% 50% at 20% 40%,color-mix(in srgb,var(--color-primary,var(--primary)) ${primaryMix},transparent),transparent 60%),
      radial-gradient(ellipse 60% 40% at 80% 60%,color-mix(in srgb,var(--color-accent,var(--accent)) ${accentMix},transparent),transparent 55%),
      radial-gradient(ellipse 70% 60% at 50% 20%,color-mix(in srgb,var(--color-secondary,var(--gold)) 8%,transparent),transparent 60%);
    animation:auroraMove 12s ease-in-out infinite alternate;filter:blur(${blur})"></div>`;
  parent.prepend(div);
  return div;
}

function initGrid() {
  mountGridLayer(document.body, "data-bg-effect");
}

function initParticles(scope?: BgScope) {
  const canvas = scope ? mkScopedCanvas("particles", scope) : mkSiteCanvas("particles");
  const ctx = canvas.getContext("2d")!;
  const count = scope ? 40 : getTieredParticleCount(80);
  const linkDist = count < 80 ? 110 : 100;
  const pts = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * (scope ? 1.2 : 1.5) + (scope ? 0.4 : 0.5),
    vx: (Math.random() - 0.5) * (scope ? 0.35 : 0.4),
    vy: (Math.random() - 0.5) * (scope ? 0.35 : 0.4),
    a: Math.random() * 0.5 + 0.2,
  }));
  const CELL = linkDist;
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pts.forEach((p) => {
      p.x = (p.x + p.vx + canvas.width) % canvas.width;
      p.y = (p.y + p.vy + canvas.height) % canvas.height;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = getEffectColor(p.a);
      ctx.fill();
    });
    if (!scope) {
      const grid = new Map<string, typeof pts>();
      for (const p of pts) {
        const key = `${Math.floor(p.x / CELL)},${Math.floor(p.y / CELL)}`;
        const bucket = grid.get(key);
        if (bucket) bucket.push(p);
        else grid.set(key, [p]);
      }
      for (const a of pts) {
        const cx = Math.floor(a.x / CELL);
        const cy = Math.floor(a.y / CELL);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const neighbors = grid.get(`${cx + dx},${cy + dy}`);
            if (!neighbors) continue;
            for (const b of neighbors) {
              if (a === b) continue;
              const d = Math.hypot(a.x - b.x, a.y - b.y);
              if (d < linkDist) {
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = getEffectColor((1 - d / linkDist) * 0.15);
                ctx.lineWidth = 0.5;
                ctx.stroke();
              }
            }
          }
        }
      }
    }
  };
  if (scope) startScopedLoop(draw, scope);
  else startSiteLoop(draw);
}

function initWaves(scope?: BgScope) {
  const canvas = scope ? mkScopedCanvas("waves", scope) : mkSiteCanvas("waves");
  const ctx = canvas.getContext("2d")!;
  let t = 0;
  const waves = scope
    ? [
        { amp: 24, freq: 0.008, spd: 0.02, y: 0.5, a: 0.07 },
        { amp: 16, freq: 0.012, spd: 0.03, y: 0.62, a: 0.05 },
      ]
    : [
        { amp: 30, freq: 0.008, spd: 0.02, y: 0.5, a: 0.06 },
        { amp: 20, freq: 0.012, spd: 0.03, y: 0.6, a: 0.04 },
        { amp: 40, freq: 0.006, spd: 0.015, y: 0.7, a: 0.03 },
      ];
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    waves.forEach((w) => {
      ctx.beginPath();
      for (let x = 0; x <= canvas.width; x++) {
        const y = canvas.height * w.y + Math.sin(x * w.freq + t * w.spd * 60) * w.amp;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = getEffectColor(w.a);
      ctx.lineWidth = scope ? 1.2 : 1.5;
      ctx.stroke();
    });
    t++;
  };
  if (scope) startScopedLoop(draw, scope);
  else startSiteLoop(draw);
}

function initStars(scope?: BgScope) {
  const canvas = scope ? mkScopedCanvas("stars", scope) : mkSiteCanvas("stars");
  const ctx = canvas.getContext("2d")!;
  const count = scope ? 80 : 150;
  const stars = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.2 + 0.2,
    tw: Math.random() * Math.PI * 2,
    spd: Math.random() * 0.05 + 0.01,
  }));
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach((s) => {
      s.tw += s.spd;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = getStarFillColor(0.3 + Math.sin(s.tw) * 0.3);
      ctx.fill();
    });
  };
  if (scope) startScopedLoop(draw, scope);
  else startSiteLoop(draw);
}

function initMatrix(scope?: BgScope) {
  const canvas = scope ? mkScopedCanvas("matrix", scope) : mkSiteCanvas("matrix");
  const ctx = canvas.getContext("2d")!;
  const fs = scope ? 11 : 13;
  const cols = Math.max(1, Math.floor(canvas.width / fs));
  const drops = Array(cols).fill(1);
  const chars = "アイウエオ01ساحبشضذ0123456789ABCDEF".split("");
  const draw = () => {
    ctx.fillStyle = getMatrixTrailColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${fs}px monospace`;
    drops.forEach((y, i) => {
      ctx.fillStyle = getEffectColor(0.2);
      ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * fs, y * fs);
      if (y * fs > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    });
  };
  if (scope) startScopedLoop(draw, scope);
  else startSiteLoop(draw);
}

function initAurora(scope?: BgScope) {
  if (scope) mountAuroraLayer(scope.container, "data-section-bg-effect");
  else mountAuroraLayer(document.body, "data-bg-effect");
}

function initNoise(scope?: BgScope) {
  const canvas = scope ? mkScopedCanvas("noise", scope) : mkSiteCanvas("noise");
  const ctx = canvas.getContext("2d")!;
  let img = ctx.createImageData(canvas.width, canvas.height);
  let lastFrame = 0;
  const hex = resolveCssColor(getThemeColor("--color-primary"));
  const pr = Number.parseInt(hex.slice(1, 3), 16);
  const pg = Number.parseInt(hex.slice(3, 5), 16);
  const pb = Number.parseInt(hex.slice(5, 7), 16);
  const draw = () => {
    const now = performance.now();
    if (now - lastFrame < 80) return;
    lastFrame = now;
    if (img.width !== canvas.width || img.height !== canvas.height) {
      img = ctx.createImageData(canvas.width, canvas.height);
    }
    for (let i = 0; i < img.data.length; i += 4) {
      if (Math.random() > 0.97) {
        img.data[i] = pr;
        img.data[i + 1] = pg;
        img.data[i + 2] = pb;
        img.data[i + 3] = scope ? 18 : 15;
      } else {
        img.data[i + 3] = 0;
      }
    }
    ctx.putImageData(img, 0, 0);
  };
  if (scope) startScopedLoop(draw, scope);
  else startSiteLoop(draw);
}

function initHexagons(scope?: BgScope) {
  const canvas = scope ? mkScopedCanvas("hexagons", scope) : mkSiteCanvas("hexagons");
  const ctx = canvas.getContext("2d")!;
  const SIZE = scope ? 28 : 36;
  const W = SIZE * 2;
  const H = Math.sqrt(3) * SIZE;
  let t = 0;

  function hexPath(cx: number, cy: number, r: number) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      i === 0
        ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
        : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    ctx.closePath();
  }

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    t += 0.008;
    const cols2 = Math.ceil(canvas.width / W) + 2;
    const rows = Math.ceil(canvas.height / H) + 2;
    for (let row = -1; row < rows; row++) {
      for (let col2 = -1; col2 < cols2; col2++) {
        const x = col2 * W + (row % 2) * SIZE;
        const y = row * H;
        const pulse = Math.sin(t + (col2 * 0.3 + row * 0.5)) * 0.5 + 0.5;
        hexPath(x, y, SIZE - 2);
        ctx.strokeStyle = getEffectColor(pulse * 0.12);
        ctx.lineWidth = 1;
        ctx.stroke();
        if (pulse > 0.85) {
          hexPath(x, y, SIZE - 2);
          ctx.fillStyle = getEffectColor(pulse * 0.04);
          ctx.fill();
        }
      }
    }
  };
  if (scope) startScopedLoop(draw, scope);
  else startSiteLoop(draw);
}

function initCircuit(scope?: BgScope) {
  const canvas = scope ? mkScopedCanvas("circuit", scope) : mkSiteCanvas("circuit");
  const ctx = canvas.getContext("2d")!;
  const GRID = scope ? 32 : 40;
  interface Node {
    x: number;
    y: number;
    connections: number[];
  }
  const nodes: Node[] = [];
  const cols2 = Math.floor(canvas.width / GRID) + 1;
  const rows = Math.floor(canvas.height / GRID) + 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols2; c++) {
      if (Math.random() > 0.65) {
        nodes.push({ x: c * GRID, y: r * GRID, connections: [] });
      }
    }
  }
  nodes.forEach((n, i) => {
    nodes.forEach((m, j) => {
      if (
        i !== j &&
        Math.abs(n.x - m.x) <= GRID &&
        Math.abs(n.y - m.y) <= GRID &&
        Math.random() > 0.5
      ) {
        n.connections.push(j);
      }
    });
  });

  const pulses: Array<{ nodeIdx: number; progress: number; connIdx: number }> = [];
  if (nodes.length > 0) {
    const pulseCount = scope ? 5 : 8;
    for (let i = 0; i < pulseCount; i++) {
      const ni = Math.floor(Math.random() * nodes.length);
      if (nodes[ni].connections.length > 0) {
        pulses.push({ nodeIdx: ni, progress: Math.random(), connIdx: 0 });
      }
    }
  }

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    nodes.forEach((n) => {
      n.connections.forEach((ci) => {
        const m = nodes[ci];
        if (!m) return;
        ctx.beginPath();
        if (Math.random() > 0.5) {
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(m.x, n.y);
          ctx.lineTo(m.x, m.y);
        } else {
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(n.x, m.y);
          ctx.lineTo(m.x, m.y);
        }
        ctx.strokeStyle = getEffectColor(0.094);
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    });
    nodes.forEach((n) => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = getEffectColor(0.25);
      ctx.fill();
    });
    pulses.forEach((p) => {
      const n = nodes[p.nodeIdx];
      if (!n || n.connections[p.connIdx] === undefined) return;
      const m = nodes[n.connections[p.connIdx]];
      if (!m) return;
      p.progress = (p.progress + 0.012) % 1;
      const px = n.x + (m.x - n.x) * p.progress;
      const py = n.y + (m.y - n.y) * p.progress;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = getEffectColor(0.8);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fillStyle = getEffectColor(0.133);
      ctx.fill();
      if (p.progress > 0.95) p.connIdx = (p.connIdx + 1) % n.connections.length;
    });
  };
  if (scope) startScopedLoop(draw, scope);
  else startSiteLoop(draw);
}

function initBubbles(scope?: BgScope) {
  const canvas = scope ? mkScopedCanvas("bubbles", scope) : mkSiteCanvas("bubbles");
  const ctx = canvas.getContext("2d")!;
  const count = scope ? 18 : 30;
  const bubbles = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: canvas.height + Math.random() * canvas.height,
    r: Math.random() * (scope ? 30 : 40) + (scope ? 8 : 10),
    speed: Math.random() * 0.4 + 0.1,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: Math.random() * 0.02 + 0.005,
  }));
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bubbles.forEach((b) => {
      b.y -= b.speed;
      b.wobble += b.wobbleSpeed;
      const x = b.x + Math.sin(b.wobble) * 20;
      if (b.y + b.r < -10) {
        b.y = canvas.height + b.r;
        b.x = Math.random() * canvas.width;
      }
      const alpha = Math.max(0, Math.min(1, (canvas.height - b.y) / canvas.height));
      ctx.beginPath();
      ctx.arc(x, b.y, b.r, 0, Math.PI * 2);
      ctx.strokeStyle = getEffectColor(alpha * 0.1);
      ctx.lineWidth = 1;
      ctx.stroke();
      const g = ctx.createRadialGradient(x - b.r * 0.3, b.y - b.r * 0.3, 0, x, b.y, b.r);
      g.addColorStop(0, getEffectColor(alpha * 0.06));
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fill();
    });
  };
  if (scope) startScopedLoop(draw, scope);
  else startSiteLoop(draw);
}

function initGeometric(scope?: BgScope) {
  const canvas = scope ? mkScopedCanvas("geometric", scope) : mkSiteCanvas("geometric");
  const ctx = canvas.getContext("2d")!;
  const count = scope ? 8 : 12;
  const shapes = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * (scope ? 60 : 80) + (scope ? 16 : 20),
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.005,
    sides: [3, 4, 5, 6][Math.floor(Math.random() * 4)],
    vx: (Math.random() - 0.5) * 0.15,
    vy: (Math.random() - 0.5) * 0.15,
    alpha: Math.random() * 0.08 + 0.02,
  }));
  const polygon = (cx: number, cy: number, r: number, sides: number, rot: number) => {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = ((Math.PI * 2) / sides) * i + rot;
      i === 0
        ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
        : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    ctx.closePath();
  };
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    shapes.forEach((s) => {
      s.rot += s.rotSpeed;
      s.x = (s.x + s.vx + canvas.width) % canvas.width;
      s.y = (s.y + s.vy + canvas.height) % canvas.height;
      polygon(s.x, s.y, s.size, s.sides, s.rot);
      ctx.strokeStyle = getEffectColor(s.alpha);
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  };
  if (scope) startScopedLoop(draw, scope);
  else startSiteLoop(draw);
}

function initVortex(scope?: BgScope) {
  const canvas = scope ? mkScopedCanvas("vortex", scope) : mkSiteCanvas("vortex");
  const ctx = canvas.getContext("2d")!;
  let t = 0;
  const ARMS = 3;
  const POINTS = scope ? 90 : 150;
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    t += 0.003;
    for (let arm = 0; arm < ARMS; arm++) {
      const offset = ((Math.PI * 2) / ARMS) * arm;
      for (let i = 0; i < POINTS; i++) {
        const r = (i / POINTS) * Math.min(cx, cy) * 0.9;
        const angle = (i / POINTS) * Math.PI * 8 + offset + t;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        const alpha = (i / POINTS) * 0.12;
        const size = ((1 - i / POINTS) * 2 + 0.3) * 1.4;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = getEffectColor(alpha);
        ctx.fill();
      }
    }
  };
  if (scope) startScopedLoop(draw, scope);
  else startSiteLoop(draw);
}

// ─── Section-scoped backgrounds (per block) ───────────────────────────────

const sectionCleanups = new WeakMap<HTMLElement, () => void>();

function isConstrainedSectionBackground(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  const root = document.documentElement;
  return root.dataset.reducedPaint === "true" || root.dataset.lowEndDevice === "true";
}

function runScopedEffect(type: string, scope: BgScope) {
  switch (type) {
    case "grid":
      mountGridLayer(scope.container, "data-section-bg-effect");
      return;
    case "particles":
      initParticles(scope);
      return;
    case "waves":
      initWaves(scope);
      return;
    case "stars":
      initStars(scope);
      return;
    case "matrix":
      initMatrix(scope);
      return;
    case "aurora":
      initAurora(scope);
      return;
    case "noise":
      initNoise(scope);
      return;
    case "hexagons":
      initHexagons(scope);
      return;
    case "circuit":
      initCircuit(scope);
      return;
    case "bubbles":
      initBubbles(scope);
      return;
    case "geometric":
      initGeometric(scope);
      return;
    case "vortex":
      initVortex(scope);
      return;
    default:
      mountGridLayer(scope.container, "data-section-bg-effect");
  }
}

export function initSectionBackgroundLayer(container: HTMLElement, type: string): () => void {
  const prev = sectionCleanups.get(container);
  prev?.();
  container.querySelectorAll("[data-section-bg-effect]").forEach((el) => el.remove());

  if (!type || type === "none") {
    return () => {};
  }

  let runtimeType = type;
  if (isConstrainedSectionBackground() && runtimeType !== "grid" && runtimeType !== "aurora") {
    runtimeType = "grid";
  }

  const scope: BgScope = { container, loopStopRef: { current: null } };
  ensureBgKeyframes();
  runScopedEffect(runtimeType, scope);

  const cleanup = () => {
    scope.loopStopRef.current?.();
    scope.loopStopRef.current = null;
    container.querySelectorAll("[data-section-bg-effect]").forEach((el) => el.remove());
  };
  sectionCleanups.set(container, cleanup);
  return cleanup;
}
