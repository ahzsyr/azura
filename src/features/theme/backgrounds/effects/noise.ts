import { createCanvas } from "../kernel/canvas-host";
import type { BackgroundEffectDefinition } from "../types";

export const noiseEffect: BackgroundEffectDefinition = {
  id: "noise",
  tier: "medium",
  mount(ctx) {
    const isSection = ctx.scope.kind === "section";
    const attr = isSection ? "data-section-bg-effect" : "data-bg-effect";
    const canvas = createCanvas("noise", ctx.scope, attr);
    ctx.applyLayerOpacity(canvas);
    const context = canvas.getContext("2d")!;
    let img = context.createImageData(canvas.width, canvas.height);
    let lastFrame = 0;
    const speedMul = Math.max(ctx.config.speed, 0.25);
    const hex = ctx.resolveColor(ctx.getThemeColor("--color-primary"));
    const pr = Number.parseInt(hex.slice(1, 3), 16);
    const pg = Number.parseInt(hex.slice(3, 5), 16);
    const pb = Number.parseInt(hex.slice(5, 7), 16);

    const draw = () => {
      const now = performance.now();
      if (now - lastFrame < 80 / speedMul) return;
      lastFrame = now;
      if (img.width !== canvas.width || img.height !== canvas.height) {
        img = context.createImageData(canvas.width, canvas.height);
      }
      const alpha = Math.round((isSection ? 18 : 15) * ctx.config.intensity);
      for (let i = 0; i < img.data.length; i += 4) {
        if (Math.random() > 0.97) {
          img.data[i] = pr;
          img.data[i + 1] = pg;
          img.data[i + 2] = pb;
          img.data[i + 3] = alpha;
        } else {
          img.data[i + 3] = 0;
        }
      }
      context.putImageData(img, 0, 0);
    };

    const stop = ctx.startLoop(draw, { visibilityRoot: ctx.scope.host });
    return () => {
      stop();
      canvas.remove();
    };
  },
};
