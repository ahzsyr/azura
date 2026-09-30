import { createCanvas } from "../kernel/canvas-host";
import type { BackgroundEffectDefinition } from "../types";

export const geometricEffect: BackgroundEffectDefinition = {
  id: "geometric",
  tier: "heavy",
  mount(ctx) {
    const isSection = ctx.scope.kind === "section";
    const attr = isSection ? "data-section-bg-effect" : "data-bg-effect";
    const canvas = createCanvas("geometric", ctx.scope, attr);
    ctx.applyLayerOpacity(canvas);
    const context = canvas.getContext("2d")!;
    const count = isSection ? 8 : 12;
    const speedMul = Math.max(ctx.config.speed, 0.25);
    const shapes = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * (isSection ? 60 : 80) + (isSection ? 16 : 20),
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.005 * speedMul,
      sides: [3, 4, 5, 6][Math.floor(Math.random() * 4)],
      vx: (Math.random() - 0.5) * 0.15 * speedMul,
      vy: (Math.random() - 0.5) * 0.15 * speedMul,
      alpha: Math.random() * 0.08 + 0.02,
    }));

    const polygon = (cx: number, cy: number, r: number, sides: number, rot: number) => {
      context.beginPath();
      for (let i = 0; i < sides; i++) {
        const a = ((Math.PI * 2) / sides) * i + rot;
        i === 0
          ? context.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
          : context.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      }
      context.closePath();
    };

    const draw = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      shapes.forEach((s) => {
        s.rot += s.rotSpeed;
        s.x = (s.x + s.vx + canvas.width) % canvas.width;
        s.y = (s.y + s.vy + canvas.height) % canvas.height;
        polygon(s.x, s.y, s.size, s.sides, s.rot);
        context.strokeStyle = ctx.getColor(s.alpha);
        context.lineWidth = 1;
        context.stroke();
      });
    };

    const stop = ctx.startLoop(draw, { visibilityRoot: ctx.scope.host });
    return () => {
      stop();
      canvas.remove();
    };
  },
};
