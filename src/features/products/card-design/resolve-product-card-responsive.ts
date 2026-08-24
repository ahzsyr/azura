import type {
  ProductCardDesignPartial,
  ProductCardResponsivePartial,
  ProductCardResponsiveRules,
  ResolvedProductCardDesign,
} from "./product-card-design.types";
import { resolveProductCardResponsiveRules } from "./resolve-product-card-design";

export function normalizeProductCardResponsivePartial(
  raw: unknown,
): ProductCardResponsivePartial | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: ProductCardResponsivePartial = {};
  const layers = ["desktop", "tablet", "mobile", "smallMobile"] as const;
  for (const layer of layers) {
    const v = o[layer];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[layer] = v as ProductCardDesignPartial;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

export function resolveResponsiveDesignForDevice(
  rules: ProductCardResponsiveRules,
  device: keyof ProductCardResponsiveRules,
): ResolvedProductCardDesign {
  return rules[device];
}

export { resolveProductCardResponsiveRules };
