import type { BackgroundEffectDefinition } from "../types";
import { mountAuroraLayer } from "./shared-layers";

export const auroraEffect: BackgroundEffectDefinition = {
  id: "aurora",
  tier: "light",
  mount(ctx) {
    const el = mountAuroraLayer(ctx, ctx.scope.kind === "site" ? "data-bg-effect" : "data-section-bg-effect");
    return () => el.remove();
  },
};
