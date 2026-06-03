/**
 * Background effects — ported from sample Astro (12 types).
 * Layers use [data-bg-effect]; reads --color-primary with --primary fallback.
 */

import { getThemeColor } from "./color-helper";

let animFrame: number | null = null;
let cleanupFn: (() => void) | null = null;

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
  if (animFrame) {
    cancelAnimationFrame(animFrame);
    animFrame = null;
  }
  if (cleanupFn) {
    cleanupFn();
    cleanupFn = null;
  }
  ensureBgKeyframes();
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

function mkCanvas(id: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.setAttribute("data-bg-effect", id);
  c.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:0;width:100%;height:100%";
  document.body.prepend(c);
  c.width = window.innerWidth;
  c.height = window.innerHeight;
  const onResize = () => {
    c.width = window.innerWidth;
    c.height = window.innerHeight;
  };
  window.addEventListener("resize", onResize);
  cleanupFn = () => window.removeEventListener("resize", onResize);
  return c;
}

function getColor() {
  return getThemeColor("--color-primary");
}

function initGrid() {
  const div = document.createElement("div");
  div.setAttribute("data-bg-effect", "grid");
  div.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:0;
    background-image:linear-gradient(color-mix(in srgb,var(--color-primary,var(--primary,#047857)) 4%,transparent) 1px,transparent 1px),
      linear-gradient(90deg,color-mix(in srgb,var(--color-primary,var(--primary,#047857)) 4%,transparent) 1px,transparent 1px);
    background-size:60px 60px;animation:gridScroll 20s linear infinite`;
  document.body.prepend(div);
}

function initParticles() {
  const canvas = mkCanvas("particles");
  const ctx = canvas.getContext("2d")!;
  const pts = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.5 + 0.5,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    a: Math.random() * 0.5 + 0.2,
  }));
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const col = getColor();
    pts.forEach((p) => {
      p.x = (p.x + p.vx + canvas.width) % canvas.width;
      p.y = (p.y + p.vy + canvas.height) % canvas.height;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle =
        col +
        Math.floor(p.a * 255)
          .toString(16)
          .padStart(2, "0");
      ctx.fill();
    });
    pts.forEach((a, i) =>
      pts.slice(i + 1).forEach((b) => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 100) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle =
            col +
            Math.floor((1 - d / 100) * 0.15 * 255)
              .toString(16)
              .padStart(2, "0");
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }),
    );
    animFrame = requestAnimationFrame(draw);
  };
  draw();
}

function initWaves() {
  const canvas = mkCanvas("waves");
  const ctx = canvas.getContext("2d")!;
  let t = 0;
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const col = getColor();
    [
      { amp: 30, freq: 0.008, spd: 0.02, y: 0.5, a: 0.06 },
      { amp: 20, freq: 0.012, spd: 0.03, y: 0.6, a: 0.04 },
      { amp: 40, freq: 0.006, spd: 0.015, y: 0.7, a: 0.03 },
    ].forEach((w) => {
      ctx.beginPath();
      for (let x = 0; x <= canvas.width; x++) {
        const y =
          canvas.height * w.y + Math.sin(x * w.freq + t * w.spd * 60) * w.amp;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle =
        col +
        Math.floor(w.a * 255)
          .toString(16)
          .padStart(2, "0");
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    t++;
    animFrame = requestAnimationFrame(draw);
  };
  draw();
}

function initStars() {
  const canvas = mkCanvas("stars");
  const ctx = canvas.getContext("2d")!;
  const stars = Array.from({ length: 150 }, () => ({
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
      ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(s.tw) * 0.3})`;
      ctx.fill();
    });
    animFrame = requestAnimationFrame(draw);
  };
  draw();
}

function initMatrix() {
  const canvas = mkCanvas("matrix");
  const ctx = canvas.getContext("2d")!;
  const fs = 13;
  const cols = Math.floor(canvas.width / fs);
  const drops = Array(cols).fill(1);
  const chars = "アイウエオ01ساحبشضذ0123456789ABCDEF".split("");
  const draw = () => {
    ctx.fillStyle = "rgba(1,4,9,.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const col = getColor();
    ctx.font = `${fs}px monospace`;
    drops.forEach((y, i) => {
      ctx.fillStyle = col + "33";
      ctx.fillText(
        chars[Math.floor(Math.random() * chars.length)],
        i * fs,
        y * fs,
      );
      if (y * fs > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    });
    animFrame = requestAnimationFrame(draw);
  };
  draw();
}

function initAurora() {
  const div = document.createElement("div");
  div.setAttribute("data-bg-effect", "aurora");
  div.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden";
  div.innerHTML = `<div style="position:absolute;width:150%;height:150%;top:-25%;left:-25%;
    background:radial-gradient(ellipse 80% 50% at 20% 40%,color-mix(in srgb,var(--color-primary,var(--primary)) 15%,transparent),transparent 60%),
      radial-gradient(ellipse 60% 40% at 80% 60%,color-mix(in srgb,var(--color-accent,var(--accent)) 10%,transparent),transparent 55%),
      radial-gradient(ellipse 70% 60% at 50% 20%,color-mix(in srgb,var(--color-secondary,var(--gold)) 8%,transparent),transparent 60%);
    animation:auroraMove 12s ease-in-out infinite alternate;filter:blur(40px)"></div>`;
  document.body.prepend(div);
}

function initNoise() {
  const canvas = mkCanvas("noise");
  const ctx = canvas.getContext("2d")!;
  const draw = () => {
    const img = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() > 0.97 ? 255 : 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = v ? 15 : 0;
    }
    ctx.putImageData(img, 0, 0);
    setTimeout(() => {
      animFrame = requestAnimationFrame(draw);
    }, 80);
  };
  draw();
}

function initHexagons() {
  const canvas = mkCanvas("hexagons");
  const ctx = canvas.getContext("2d")!;
  const SIZE = 36;
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
    const col = getColor();
    t += 0.008;
    const cols2 = Math.ceil(canvas.width / W) + 2;
    const rows = Math.ceil(canvas.height / H) + 2;
    for (let row = -1; row < rows; row++) {
      for (let col2 = -1; col2 < cols2; col2++) {
        const x = col2 * W + (row % 2) * SIZE;
        const y = row * H;
        const pulse = Math.sin(t + (col2 * 0.3 + row * 0.5)) * 0.5 + 0.5;
        hexPath(x, y, SIZE - 2);
        ctx.strokeStyle =
          col +
          Math.floor(pulse * 0.12 * 255)
            .toString(16)
            .padStart(2, "0");
        ctx.lineWidth = 1;
        ctx.stroke();
        if (pulse > 0.85) {
          hexPath(x, y, SIZE - 2);
          ctx.fillStyle =
            col +
            Math.floor(pulse * 0.04 * 255)
              .toString(16)
              .padStart(2, "0");
          ctx.fill();
        }
      }
    }
    animFrame = requestAnimationFrame(draw);
  };
  draw();
}

function initCircuit() {
  const canvas = mkCanvas("circuit");
  const ctx = canvas.getContext("2d")!;
  const GRID = 40;
  interface Node {
    x: number;
    y: number;
    connections: number[];
  }
  const nodes: Node[] = [];
  const cols2 = Math.floor(canvas.width / GRID) + 1;
  const rows = Math.floor(canvas.height / GRID) + 1;

  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols2; c++) {
      if (Math.random() > 0.65) {
        nodes.push({ x: c * GRID, y: r * GRID, connections: [] });
      }
    }
  nodes.forEach((n, i) => {
    nodes.forEach((m, j) => {
      if (
        i !== j &&
        Math.abs(n.x - m.x) <= GRID &&
        Math.abs(n.y - m.y) <= GRID &&
        Math.random() > 0.5
      )
        n.connections.push(j);
    });
  });

  const pulses: Array<{ nodeIdx: number; progress: number; connIdx: number }> =
    [];
  if (nodes.length > 0) {
    for (let i = 0; i < 8; i++) {
      const ni = Math.floor(Math.random() * nodes.length);
      if (nodes[ni].connections.length > 0)
        pulses.push({ nodeIdx: ni, progress: Math.random(), connIdx: 0 });
    }
  }

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const col = getColor();

    nodes.forEach((n) => {
      n.connections.forEach((ci) => {
        const m = nodes[ci];
        ctx.beginPath();
        if (Math.random() > 0.95) {
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(m.x, n.y);
          ctx.lineTo(m.x, m.y);
        } else {
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(n.x, m.y);
          ctx.lineTo(m.x, m.y);
        }
        ctx.strokeStyle = col + "18";
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    });

    nodes.forEach((n) => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = col + "40";
      ctx.fill();
    });

    pulses.forEach((p) => {
      const n = nodes[p.nodeIdx];
      if (!n || !n.connections[p.connIdx]) return;
      const m = nodes[n.connections[p.connIdx]];
      if (!m) return;
      p.progress = (p.progress + 0.012) % 1;
      const px = n.x + (m.x - n.x) * p.progress;
      const py = n.y + (m.y - n.y) * p.progress;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = col + "cc";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fillStyle = col + "22";
      ctx.fill();
      if (p.progress > 0.95) p.connIdx = (p.connIdx + 1) % n.connections.length;
    });
    animFrame = requestAnimationFrame(draw);
  };
  draw();
}

function initBubbles() {
  const canvas = mkCanvas("bubbles");
  const ctx = canvas.getContext("2d")!;
  const bubbles = Array.from({ length: 30 }, () => ({
    x: Math.random() * canvas.width,
    y: canvas.height + Math.random() * canvas.height,
    r: Math.random() * 40 + 10,
    speed: Math.random() * 0.4 + 0.1,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: Math.random() * 0.02 + 0.005,
  }));
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const col = getColor();
    bubbles.forEach((b) => {
      b.y -= b.speed;
      b.wobble += b.wobbleSpeed;
      const x = b.x + Math.sin(b.wobble) * 20;
      if (b.y + b.r < -10) {
        b.y = canvas.height + b.r;
        b.x = Math.random() * canvas.width;
      }
      const alpha = Math.max(
        0,
        Math.min(1, (canvas.height - b.y) / canvas.height),
      );
      ctx.beginPath();
      ctx.arc(x, b.y, b.r, 0, Math.PI * 2);
      ctx.strokeStyle =
        col +
        Math.floor(alpha * 0.1 * 255)
          .toString(16)
          .padStart(2, "0");
      ctx.lineWidth = 1;
      ctx.stroke();
      const g = ctx.createRadialGradient(
        x - b.r * 0.3,
        b.y - b.r * 0.3,
        0,
        x,
        b.y,
        b.r,
      );
      g.addColorStop(
        0,
        col +
          Math.floor(alpha * 0.06 * 255)
            .toString(16)
            .padStart(2, "0"),
      );
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fill();
    });
    animFrame = requestAnimationFrame(draw);
  };
  draw();
}

function initGeometric() {
  const canvas = mkCanvas("geometric");
  const ctx = canvas.getContext("2d")!;
  const shapes = Array.from({ length: 12 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 80 + 20,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.005,
    sides: [3, 4, 5, 6][Math.floor(Math.random() * 4)],
    vx: (Math.random() - 0.5) * 0.15,
    vy: (Math.random() - 0.5) * 0.15,
    alpha: Math.random() * 0.08 + 0.02,
  }));
  const polygon = (
    cx: number,
    cy: number,
    r: number,
    sides: number,
    rot: number,
  ) => {
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
    const col = getColor();
    shapes.forEach((s) => {
      s.rot += s.rotSpeed;
      s.x = (s.x + s.vx + canvas.width) % canvas.width;
      s.y = (s.y + s.vy + canvas.height) % canvas.height;
      polygon(s.x, s.y, s.size, s.sides, s.rot);
      ctx.strokeStyle =
        col +
        Math.floor(s.alpha * 255)
          .toString(16)
          .padStart(2, "0");
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    animFrame = requestAnimationFrame(draw);
  };
  draw();
}

function initVortex() {
  const canvas = mkCanvas("vortex");
  const ctx = canvas.getContext("2d")!;
  let t = 0;
  const ARMS = 3;
  const POINTS = 300;
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const col = getColor();
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
        const size = (1 - i / POINTS) * 2 + 0.3;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle =
          col +
          Math.floor(alpha * 255)
            .toString(16)
            .padStart(2, "0");
        ctx.fill();
      }
    }
    animFrame = requestAnimationFrame(draw);
  };
  draw();
}

// ─── Section-scoped backgrounds (per block) ───────────────────────────────

const sectionCleanups = new WeakMap<HTMLElement, () => void>();

function sectionLayerBase(): string {
  return "position:absolute;inset:0;pointer-events:none;z-index:0;width:100%;height:100%;overflow:hidden;";
}

export function initSectionBackgroundLayer(container: HTMLElement, type: string): () => void {
  const prev = sectionCleanups.get(container);
  prev?.();
  container.querySelectorAll("[data-section-bg-effect]").forEach((el) => el.remove());

  if (!type || type === "none") {
    return () => {};
  }

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (type === "grid") {
    const div = document.createElement("div");
    div.setAttribute("data-section-bg-effect", type);
    div.className = `az-section-bg-layer az-section-bg-${type}`;
    div.style.cssText =
      sectionLayerBase() +
      `background-image:linear-gradient(color-mix(in srgb,var(--color-primary,var(--primary)) 4%,transparent) 1px,transparent 1px),
      linear-gradient(90deg,color-mix(in srgb,var(--color-primary,var(--primary)) 4%,transparent) 1px,transparent 1px);
      background-size:48px 48px;animation:gridScroll 24s linear infinite`;
    container.prepend(div);
    const cleanup = () => div.remove();
    sectionCleanups.set(container, cleanup);
    return cleanup;
  }

  if (type === "aurora") {
    const div = document.createElement("div");
    div.setAttribute("data-section-bg-effect", "aurora");
    div.style.cssText = sectionLayerBase() + "overflow:hidden";
    div.innerHTML = `<div style="position:absolute;width:150%;height:150%;top:-25%;left:-25%;
      background:radial-gradient(ellipse 80% 50% at 20% 40%,color-mix(in srgb,var(--color-primary,var(--primary)) 15%,transparent),transparent 60%),
        radial-gradient(ellipse 60% 40% at 80% 60%,color-mix(in srgb,var(--color-accent,var(--accent)) 10%,transparent),transparent 55%);
      animation:auroraMove 12s ease-in-out infinite alternate;filter:blur(36px)"></div>`;
    container.prepend(div);
    const cleanup = () => div.remove();
    sectionCleanups.set(container, cleanup);
    return cleanup;
  }

  if (reduced) {
    return () => {};
  }

  const canvas = document.createElement("canvas");
  canvas.setAttribute("data-section-bg-effect", type);
  canvas.style.cssText = sectionLayerBase();
  container.prepend(canvas);

  let localFrame: number | null = null;
  let localCleanup: (() => void) | null = null;

  const resize = () => {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  localCleanup = () => ro.disconnect();

  const ctx = canvas.getContext("2d")!;
  const col = getColor();

  if (type === "particles") {
    const pts = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.4,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      a: Math.random() * 0.4 + 0.15,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach((p) => {
        p.x = (p.x + p.vx + canvas.width) % canvas.width;
        p.y = (p.y + p.vy + canvas.height) % canvas.height;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle =
          col +
          Math.floor(p.a * 255)
            .toString(16)
            .padStart(2, "0");
        ctx.fill();
      });
      localFrame = requestAnimationFrame(draw);
    };
    draw();
  } else if (type === "waves") {
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      [
        { amp: 24, freq: 0.008, spd: 0.02, y: 0.5, a: 0.07 },
        { amp: 16, freq: 0.012, spd: 0.03, y: 0.62, a: 0.05 },
      ].forEach((w) => {
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x++) {
          const y =
            canvas.height * w.y + Math.sin(x * w.freq + t * w.spd * 60) * w.amp;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle =
          col +
          Math.floor(w.a * 255)
            .toString(16)
            .padStart(2, "0");
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });
      t++;
      localFrame = requestAnimationFrame(draw);
    };
    draw();
  } else if (type === "stars") {
    const stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.1 + 0.2,
      tw: Math.random() * Math.PI * 2,
      spd: Math.random() * 0.04 + 0.01,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s) => {
        s.tw += s.spd;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.25 + Math.sin(s.tw) * 0.25})`;
        ctx.fill();
      });
      localFrame = requestAnimationFrame(draw);
    };
    draw();
  } else {
    const div = document.createElement("div");
    div.setAttribute("data-section-bg-effect", "grid-fallback");
    div.style.cssText =
      sectionLayerBase() +
      `background-image:linear-gradient(color-mix(in srgb,var(--color-primary) 3%,transparent) 1px,transparent 1px),
      linear-gradient(90deg,color-mix(in srgb,var(--color-primary) 3%,transparent) 1px,transparent 1px);
      background-size:40px 40px`;
    container.prepend(div);
    canvas.remove();
    const cleanup = () => {
      div.remove();
      localCleanup?.();
    };
    sectionCleanups.set(container, cleanup);
    return cleanup;
  }

  const cleanup = () => {
    if (localFrame) cancelAnimationFrame(localFrame);
    localCleanup?.();
    canvas.remove();
  };
  sectionCleanups.set(container, cleanup);
  return cleanup;
}
