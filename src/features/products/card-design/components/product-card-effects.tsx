"use client";

import type { ProductCardRenderContext } from "./product-card-context";

type Props = {
  ctx: ProductCardRenderContext;
};

export function ProductCardEffects({ ctx }: Props) {
  const { effects } = ctx.design;
  if (!effects.enabled) return null;

  return (
    <>
      {effects.gradientBorder ? (
        <span className="pl-card__fx pl-card__fx--gradient-border" aria-hidden="true" />
      ) : null}
      {effects.glassLayer ? (
        <span className="pl-card__fx pl-card__fx--glass" aria-hidden="true" />
      ) : null}
      {effects.glow ? <span className="pl-card__fx pl-card__fx--glow" aria-hidden="true" /> : null}
      {effects.lightSweep ? (
        <span className="pl-card__fx pl-card__fx--sweep" aria-hidden="true" />
      ) : null}
      {effects.noiseTexture ? (
        <span className="pl-card__fx pl-card__fx--noise" aria-hidden="true" />
      ) : null}
    </>
  );
}
