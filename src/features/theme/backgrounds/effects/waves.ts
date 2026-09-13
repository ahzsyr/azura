import { createCanvas } from "../kernel/canvas-host";
import type { BackgroundEffectDefinition } from "../types";

export const wavesEffect: BackgroundEffectDefinition = {
  id: "waves",
  tier: "medium",
  mount(ctx) {
    const isSection = ctx.scope.kind === "section";
    const attr = isSection ? "data-section-bg-effect" : "data-bg-effect";
    const canvas = createCanvas("waves", ctx.scope, attr);
    ctx.applyLayerOpacity(canvas);
    const context = canvas.getContext("2d")!;
    let t = 0;
    const speedMul = Math.max(ctx.config.speed, 0.25);
    const waves = isSection
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
      context.clearRect(0, 0, canvas.width, canvas.height);
      waves.forEach((w) => {
        context.beginPath();
        for (let x = 0; x <= canvas.width; x++) {
          const y =
            canvas.height * w.y +
            Math.sin(x * w.freq + t * w.spd * 60 * speedMul) * w.amp * ctx.config.intensity;
          x === 0 ? context.moveTo(x, y) : context.lineTo(x, y);
        }
        context.strokeStyle = ctx.getColor(w.a);
        context.lineWidth = isSection ? 1.2 : 1.5;
        context.stroke();
      });
      t += speedMul;
    };

    const stop = ctx.startLoop(draw, { visibilityRoot: ctx.scope.host });
    return () => {
      stop();
      canvas.remove();
    };
  },
};
