import type { BackgroundEffectDefinition } from "../types";
import { mountGridLayer } from "./shared-layers";

export const gridEffect: BackgroundEffectDefinition = {
  id: "grid",
  tier: "light",
  mount(ctx) {
    const el = mountGridLayer(ctx, ctx.scope.kind === "site" ? "data-bg-effect" : "data-section-bg-effect");
    return () => el.remove();
  },
};
