import { createCanvas } from "../kernel/canvas-host";
import type { BackgroundEffectDefinition } from "../types";

export const starsEffect: BackgroundEffectDefinition = {
  id: "stars",
  tier: "medium",
  mount(ctx) {
    const isSection = ctx.scope.kind === "section";
    const attr = isSection ? "data-section-bg-effect" : "data-bg-effect";
    const canvas = createCanvas("stars", ctx.scope, attr);
    ctx.applyLayerOpacity(canvas);
    const context = canvas.getContext("2d")!;
    const count = isSection ? 80 : 150;
    const speedMul = Math.max(ctx.config.speed, 0.25);
    const stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.2,
      tw: Math.random() * Math.PI * 2,
      spd: (Math.random() * 0.05 + 0.01) * speedMul,
    }));

    const draw = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s) => {
        s.tw += s.spd;
        context.beginPath();
        context.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        context.fillStyle = ctx.getStarColor(0.3 + Math.sin(s.tw) * 0.3);
        context.fill();
      });
    };

    const stop = ctx.startLoop(draw, { visibilityRoot: ctx.scope.host });
    return () => {
      stop();
      canvas.remove();
    };
  },
};
