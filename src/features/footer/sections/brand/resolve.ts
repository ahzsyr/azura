import type { SectionResolveContext } from "../types";
import { baseResolvedColumn } from "../shared";

export function resolveBrand(ctx: SectionResolveContext) {
  return baseResolvedColumn(ctx.column);
}
