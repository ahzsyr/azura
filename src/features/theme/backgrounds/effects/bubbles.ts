import { createCanvas } from "../kernel/canvas-host";
import type { BackgroundEffectDefinition } from "../types";

export const bubblesEffect: BackgroundEffectDefinition = {
  id: "bubbles",
  tier: "medium",
  mount(ctx) {
    const isSection = ctx.scope.kind === "section";
    const attr = isSection ? "data-section-bg-effect" : "data-bg-effect";
    const canvas = createCanvas("bubbles", ctx.scope, attr);
    ctx.applyLayerOpacity(canvas);
    const context = canvas.getContext("2d")!;
    const count = isSection ? 18 : 30;
    const speedMul = Math.max(ctx.config.speed, 0.25);
    const bubbles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * canvas.height,
      r: Math.random() * (isSection ? 30 : 40) + (isSection ? 8 : 10),
      speed: (Math.random() * 0.4 + 0.1) * speedMul,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: (Math.random() * 0.02 + 0.005) * speedMul,
    }));

    const draw = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      bubbles.forEach((b) => {
        b.y -= b.speed;
        b.wobble += b.wobbleSpeed;
        const x = b.x + Math.sin(b.wobble) * 20;
        if (b.y + b.r < -10) {
          b.y = canvas.height + b.r;
          b.x = Math.random() * canvas.width;
        }
        const alpha = Math.max(0, Math.min(1, (canvas.height - b.y) / canvas.height));
        context.beginPath();
        context.arc(x, b.y, b.r, 0, Math.PI * 2);
        context.strokeStyle = ctx.getColor(alpha * 0.1);
        context.lineWidth = 1;
        context.stroke();
        const g = context.createRadialGradient(x - b.r * 0.3, b.y - b.r * 0.3, 0, x, b.y, b.r);
        g.addColorStop(0, ctx.getColor(alpha * 0.06));
        g.addColorStop(1, "transparent");
        context.fillStyle = g;
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
