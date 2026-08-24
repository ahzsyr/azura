import { createCanvas } from "../kernel/canvas-host";
import type { BackgroundEffectDefinition } from "../types";

export const hexagonsEffect: BackgroundEffectDefinition = {
  id: "hexagons",
  tier: "heavy",
  mount(ctx) {
    const isSection = ctx.scope.kind === "section";
    const attr = isSection ? "data-section-bg-effect" : "data-bg-effect";
    const canvas = createCanvas("hexagons", ctx.scope, attr);
    ctx.applyLayerOpacity(canvas);
    const context = canvas.getContext("2d")!;
    const SIZE = isSection ? 28 : 36;
    const W = SIZE * 2;
    const H = Math.sqrt(3) * SIZE;
    let t = 0;
    const speedMul = Math.max(ctx.config.speed, 0.25);

    function hexPath(cx: number, cy: number, r: number) {
      context.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        i === 0
          ? context.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
          : context.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      }
      context.closePath();
    }

    const draw = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.008 * speedMul;
      const cols2 = Math.ceil(canvas.width / W) + 2;
      const rows = Math.ceil(canvas.height / H) + 2;
      for (let row = -1; row < rows; row++) {
        for (let col2 = -1; col2 < cols2; col2++) {
          const x = col2 * W + (row % 2) * SIZE;
          const y = row * H;
          const pulse = Math.sin(t + (col2 * 0.3 + row * 0.5)) * 0.5 + 0.5;
          hexPath(x, y, SIZE - 2);
          context.strokeStyle = ctx.getColor(pulse * 0.12);
          context.lineWidth = 1;
          context.stroke();
          if (pulse > 0.85) {
            hexPath(x, y, SIZE - 2);
            context.fillStyle = ctx.getColor(pulse * 0.04);
            context.fill();
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
