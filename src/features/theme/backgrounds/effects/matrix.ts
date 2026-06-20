import { createCanvas } from "../kernel/canvas-host";
import type { BackgroundEffectDefinition } from "../types";

export const matrixEffect: BackgroundEffectDefinition = {
  id: "matrix",
  tier: "heavy",
  mount(ctx) {
    const isSection = ctx.scope.kind === "section";
    const attr = isSection ? "data-section-bg-effect" : "data-bg-effect";
    const canvas = createCanvas("matrix", ctx.scope, attr);
    ctx.applyLayerOpacity(canvas);
    const context = canvas.getContext("2d")!;
    const fs = isSection ? 11 : 13;
    const speedMul = Math.max(ctx.config.speed, 0.25);
    let cols = Math.max(1, Math.floor(canvas.width / fs));
    let drops = Array(cols).fill(1);
    const chars = "アイウエオ01ساحبشضذ0123456789ABCDEF".split("");

    const draw = () => {
      cols = Math.max(1, Math.floor(canvas.width / fs));
      if (drops.length !== cols) drops = Array(cols).fill(1);
      context.fillStyle = ctx.getMatrixTrail();
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.font = `${fs}px monospace`;
      drops.forEach((y, i) => {
        context.fillStyle = ctx.getColor(0.2);
        context.fillText(chars[Math.floor(Math.random() * chars.length)], i * fs, y * fs);
        if (y * fs > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += speedMul;
      });
    };

    const stop = ctx.startLoop(draw, { visibilityRoot: ctx.scope.host });
    return () => {
      stop();
      canvas.remove();
    };
  },
};
