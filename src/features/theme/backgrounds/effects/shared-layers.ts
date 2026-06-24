import { sectionLayerBase } from "../kernel/canvas-host";
import type { BackgroundMountContext } from "../types";

export function mountGridLayer(
  ctx: BackgroundMountContext,
  attr: "data-bg-effect" | "data-section-bg-effect",
) {
  const div = document.createElement("div");
  div.setAttribute(attr, "grid");
  if (attr === "data-section-bg-effect") {
    div.className = "az-section-bg-layer az-section-bg-grid";
  }
  const isSection = attr === "data-section-bg-effect";
  const mix = isSection ? "5%" : "4%";
  const size = isSection ? "48px 48px" : "60px 60px";
  const speed = Math.max(ctx.config.speed, 0.25);
  const duration = `${(isSection ? 24 : 20) / speed}s`;
  const isSite = ctx.scope.kind === "site";
  div.style.cssText = `${isSite ? "position:absolute;inset:0;pointer-events:none;z-index:0;" : sectionLayerBase()}
    background-image:linear-gradient(color-mix(in srgb,var(--color-primary,var(--primary,#047857)) ${mix},transparent) 1px,transparent 1px),
      linear-gradient(90deg,color-mix(in srgb,var(--color-primary,var(--primary,#047857)) ${mix},transparent) 1px,transparent 1px);
    background-size:${size};animation:gridScroll ${duration} linear infinite`;
  ctx.scope.host.prepend(div);
  ctx.applyLayerOpacity(div);
  return div;
}

export function mountAuroraLayer(
  ctx: BackgroundMountContext,
  attr: "data-bg-effect" | "data-section-bg-effect",
) {
  const div = document.createElement("div");
  div.setAttribute(attr, "aurora");
  const isSite = ctx.scope.kind === "site";
  const base = isSite
    ? "position:absolute;inset:0;pointer-events:none;z-index:0;overflow:hidden"
    : `${sectionLayerBase()}overflow:hidden`;
  const blur = isSite ? "40px" : "36px";
  const primaryMix = isSite ? "15%" : "18%";
  const accentMix = isSite ? "10%" : "12%";
  const speed = Math.max(ctx.config.speed, 0.25);
  div.style.cssText = base;
  div.innerHTML = `<div style="position:absolute;width:150%;height:150%;top:-25%;left:-25%;
    background:radial-gradient(ellipse 80% 50% at 20% 40%,color-mix(in srgb,var(--color-primary,var(--primary)) ${primaryMix},transparent),transparent 60%),
      radial-gradient(ellipse 60% 40% at 80% 60%,color-mix(in srgb,var(--color-accent,var(--accent)) ${accentMix},transparent),transparent 55%),
      radial-gradient(ellipse 70% 60% at 50% 20%,color-mix(in srgb,var(--color-secondary,var(--gold)) 8%,transparent),transparent 60%);
    animation:auroraMove ${12 / speed}s ease-in-out infinite alternate;filter:blur(${blur})"></div>`;
  ctx.scope.host.prepend(div);
  ctx.applyLayerOpacity(div);
  return div;
}
