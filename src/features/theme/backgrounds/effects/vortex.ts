import { createCanvas } from "../kernel/canvas-host";
import type { BackgroundEffectDefinition } from "../types";

export const vortexEffect: BackgroundEffectDefinition = {
  id: "vortex",
  tier: "heavy",
  mount(ctx) {
    const isSection = ctx.scope.kind === "section";
    const attr = isSection ? "data-section-bg-effect" : "data-bg-effect";
    const canvas = createCanvas("vortex", ctx.scope, attr);
    ctx.applyLayerOpacity(canvas);
    const context = canvas.getContext("2d")!;
    let t = 0;
    const ARMS = 3;
    const POINTS = isSection ? 90 : 150;
    const speedMul = Math.max(ctx.config.speed, 0.25);

    const draw = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      t += 0.003 * speedMul;
      for (let arm = 0; arm < ARMS; arm++) {
        const offset = ((Math.PI * 2) / ARMS) * arm;
        for (let i = 0; i < POINTS; i++) {
          const r = (i / POINTS) * Math.min(cx, cy) * 0.9;
          const angle = (i / POINTS) * Math.PI * 8 + offset + t;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          const alpha = (i / POINTS) * 0.12;
          const size = ((1 - i / POINTS) * 2 + 0.3) * 1.4;
          context.beginPath();
          context.arc(x, y, size, 0, Math.PI * 2);
          context.fillStyle = ctx.getColor(alpha);
          context.fill();
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
