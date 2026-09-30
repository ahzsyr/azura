import type { SectionResolveContext } from "../types";
import { baseResolvedColumn } from "../shared";

export function resolveSocial(ctx: SectionResolveContext) {
  return baseResolvedColumn(ctx.column);
}
