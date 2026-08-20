import { createCanvas } from "../kernel/canvas-host";
import { getTieredParticleCount } from "../kernel/animation-loop";
import type { BackgroundEffectDefinition } from "../types";

export const particlesEffect: BackgroundEffectDefinition = {
  id: "particles",
  tier: "heavy",
  mount(ctx) {
    const isSection = ctx.scope.kind === "section";
    const attr = isSection ? "data-section-bg-effect" : "data-bg-effect";
    const canvas = createCanvas("particles", ctx.scope, attr);
    ctx.applyLayerOpacity(canvas);
    const context = canvas.getContext("2d")!;
    const count = isSection ? 40 : getTieredParticleCount(80, ctx.config.intensity);
    const linkDist = count < 80 ? 110 : 100;
    const speedMul = Math.max(ctx.config.speed, 0.25);
    const pts = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * (isSection ? 1.2 : 1.5) + (isSection ? 0.4 : 0.5),
      vx: (Math.random() - 0.5) * (isSection ? 0.35 : 0.4) * speedMul,
      vy: (Math.random() - 0.5) * (isSection ? 0.35 : 0.4) * speedMul,
      a: Math.random() * 0.5 + 0.2,
    }));
    const CELL = linkDist;

    const draw = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      const mouse = ctx.mouse;
      pts.forEach((p) => {
        if (!isSection && mouse?.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 140 && dist > 0) {
            const force = ((140 - dist) / 140) * 0.02 * ctx.config.intensity;
            p.vx -= (dx / dist) * force;
            p.vy -= (dy / dist) * force;
          }
        }
        p.x = (p.x + p.vx + canvas.width) % canvas.width;
        p.y = (p.y + p.vy + canvas.height) % canvas.height;
        context.beginPath();
        context.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        context.fillStyle = ctx.getColor(p.a);
        context.fill();
      });
      if (!isSection) {
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
                  context.beginPath();
                  context.moveTo(a.x, a.y);
                  context.lineTo(b.x, b.y);
                  context.strokeStyle = ctx.getColor((1 - d / linkDist) * 0.15);
                  context.lineWidth = 0.5;
                  context.stroke();
                }
              }
            }
          }
        }
      }
    };

    const stop = ctx.startLoop(draw, { visibilityRoot: ctx.scope.host });
    return () => {
      stop();
      canvas.remove();
    };
  },
};
